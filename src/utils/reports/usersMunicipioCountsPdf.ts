import { loadLogoAssetForLandscapePdf } from "@/utils/pdfCityBranding";

type Rgb = [number, number, number];

export interface UsersCountsReportResponse {
  general?: Partial<{
    students: number;
    teachers: number;
    directors: number;
    coordinators: number;
    tecadm: number;
  }>;
  by_school?: Array<{
    school_id?: string;
    school_name?: string;
    students?: number;
    teachers?: number;
    directors?: number;
    coordinators?: number;
    tecadm?: number;
  }>;
  by_grade?: Array<{
    grade_id?: string;
    grade_name?: string;
    students?: number;
    teachers?: number;
    directors?: number;
    coordinators?: number;
    tecadm?: number;
  }>;
  by_class?: Array<{
    class_id?: string;
    class_name?: string;
    school_id?: string;
    school_name?: string;
    grade_id?: string;
    grade_name?: string;
    students?: number;
    teachers?: number;
    directors?: number;
    coordinators?: number;
    tecadm?: number;
  }>;
}

function n(value: unknown): number {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : 0;
}

export async function generateUsersMunicipioCountsPdf(args: {
  cityId: string;
  cityName: string;
  report: UsersCountsReportResponse;
}): Promise<void> {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);

  const COLORS: Record<string, Rgb> = {
    primary: [124, 62, 237],
    textDark: [31, 41, 55],
    textGray: [107, 114, 128],
    borderLight: [229, 231, 235],
    bgLight: [250, 250, 250],
    white: [255, 255, 255],
  };

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const centerX = pageW / 2;
  const margin = 15;

  const logoAsset = await loadLogoAssetForLandscapePdf(args.cityId);

  const drawCover = () => {
    const BAND_H = 58;
    doc.setFillColor(...COLORS.white);
    doc.rect(0, 0, pageW, pageH, "F");
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 0, pageW, BAND_H, "F");

    let logoBottom = 0;
    if (logoAsset?.dataUrl && logoAsset.iw > 0 && logoAsset.ih > 0) {
      const desiredW = 38;
      const desiredH = (logoAsset.ih * desiredW) / logoAsset.iw;
      doc.addImage(logoAsset.dataUrl, "PNG", centerX - desiredW / 2, 7, desiredW, desiredH);
      logoBottom = 7 + desiredH;
    } else {
      doc.setFontSize(18);
      doc.setTextColor(...COLORS.white);
      doc.setFont("helvetica", "bold");
      doc.text("AFIRME PLAY", centerX, 22, { align: "center" });
      logoBottom = 28;
    }

    const titleY = Math.max(logoBottom + 5, BAND_H - 17);
    doc.setTextColor(...COLORS.white);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("RELATÓRIO DE USUÁRIOS", centerX, titleY, { align: "center" });
    doc.setFontSize(12);
    doc.text(`DO MUNICÍPIO ${String(args.cityName || "").toUpperCase()}`, centerX, titleY + 8, {
      align: "center",
    });

    let y = BAND_H + 20;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.textGray);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, centerX, y, { align: "center" });
    y += 18;

    const cardW = pageW - 40;
    const cardX = (pageW - cardW) / 2;
    const cardH = 72;
    const ACCENT_W = 4;
    doc.setFillColor(...COLORS.bgLight);
    doc.rect(cardX, y, cardW, cardH, "F");
    doc.setFillColor(...COLORS.primary);
    doc.rect(cardX, y, ACCENT_W, cardH, "F");
    doc.setDrawColor(...COLORS.borderLight);
    doc.setLineWidth(0.4);
    doc.rect(cardX, y, cardW, cardH, "S");

    const lx = cardX + ACCENT_W + 10;
    const labelW = 58;
    const vx = lx + labelW + 4;
    // A linha divisória do título fica em y+14; começar o conteúdo abaixo para não "cortar" a 1ª linha.
    let cy = y + 22;
    const rowH = 7;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.primary);
    doc.text("RESUMO", cardX + ACCENT_W + (cardW - ACCENT_W) / 2, y + 10, { align: "center" });
    doc.setDrawColor(...COLORS.borderLight);
    doc.setLineWidth(0.3);
    doc.line(cardX + ACCENT_W + 4, y + 14, cardX + cardW - 4, y + 14);

    const g = args.report.general ?? {};
    const rows: Array<[string, string]> = [
      ["ALUNOS:", String(n(g.students))],
      ["PROFESSORES:", String(n(g.teachers))],
      ["DIRETORES:", String(n(g.directors))],
      ["COORDENADORES:", String(n(g.coordinators))],
      ["TEC. ADM:", String(n(g.tecadm))],
    ];

    doc.setFontSize(11);
    for (const [label, value] of rows) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COLORS.primary);
      doc.text(label, lx, cy);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COLORS.textDark);
      doc.text(value, vx, cy);
      cy += rowH;
    }

    // Observação sob o card (contexto importante para leitura dos totais)
    const note = "Observação: podem existir diretores e coordenadores com contas criadas, mas ainda não vinculadas a nenhuma escola.";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textGray);
    const noteY = y + cardH + 10;
    const noteW = cardW - 18;
    const noteLines = doc.splitTextToSize(note, noteW);
    doc.text(noteLines, cardX + 9, noteY);
  };

  drawCover();
  doc.addPage();

  const addSectionTitle = (title: string, y: number): number => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.primary);
    doc.text(title, margin, y);
    doc.setDrawColor(...COLORS.borderLight);
    doc.setLineWidth(0.3);
    doc.line(margin, y + 2, pageW - margin, y + 2);
    return y + 10;
  };

  let y = margin;

  y = addSectionTitle("Resultados gerais", y);
  const g = args.report.general ?? {};
  autoTable(doc, {
    startY: y,
    styles: { font: "helvetica", fontSize: 10, textColor: COLORS.textDark as unknown as number[] },
    headStyles: { fillColor: COLORS.primary as unknown as number[], textColor: COLORS.white as unknown as number[] },
    bodyStyles: { fillColor: COLORS.white as unknown as number[] },
    head: [["Perfil", "Quantidade"]],
    body: [
      ["Alunos", n(g.students)],
      ["Professores", n(g.teachers)],
      ["Diretores", n(g.directors)],
      ["Coordenadores", n(g.coordinators)],
      ["Técnico administrativo", n(g.tecadm)],
    ].map(([a, b]) => [String(a), String(b)]),
    theme: "striped",
    margin: { left: margin, right: margin },
  });
  y = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
    ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
    : y + 40;

  const addCountsTable = (title: string, head: string[], body: Array<Array<string | number>>) => {
    if (y > pageH - 60) {
      doc.addPage();
      y = margin;
    }
    y = addSectionTitle(title, y);
    autoTable(doc, {
      startY: y,
      styles: { font: "helvetica", fontSize: 9, textColor: COLORS.textDark as unknown as number[] },
      headStyles: { fillColor: COLORS.primary as unknown as number[], textColor: COLORS.white as unknown as number[] },
      bodyStyles: { fillColor: COLORS.white as unknown as number[] },
      head: [head],
      body: body.map((row) => row.map((c) => (typeof c === "number" ? String(c) : String(c ?? "")))),
      theme: "striped",
      margin: { left: margin, right: margin },
    });
    y = (doc as unknown as { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
      ? (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12
      : y + 40;
  };

  const bySchool = Array.isArray(args.report.by_school) ? args.report.by_school : [];
  addCountsTable(
    "Por escola",
    ["Escola", "Alunos", "Professores", "Diretores", "Coordenadores", "Tec. Adm"],
    bySchool.map((r) => [
      r.school_name ?? "—",
      n(r.students),
      n(r.teachers),
      n(r.directors),
      n(r.coordinators),
      n(r.tecadm),
    ])
  );

  const byGrade = Array.isArray(args.report.by_grade) ? args.report.by_grade : [];
  addCountsTable(
    "Por série",
    ["Série", "Alunos", "Professores", "Diretores", "Coordenadores", "Tec. Adm"],
    byGrade.map((r) => [
      r.grade_name ?? "—",
      n(r.students),
      n(r.teachers),
      n(r.directors),
      n(r.coordinators),
      n(r.tecadm),
    ])
  );

  const byClass = Array.isArray(args.report.by_class) ? args.report.by_class : [];
  addCountsTable(
    "Por turma",
    ["Turma", "Escola", "Série", "Alunos", "Professores", "Diretores", "Coordenadores", "Tec. Adm"],
    byClass.map((r) => [
      r.class_name ?? "—",
      r.school_name ?? "—",
      r.grade_name ?? "—",
      n(r.students),
      n(r.teachers),
      n(r.directors),
      n(r.coordinators),
      n(r.tecadm),
    ])
  );

  const safeCity = String(args.cityName || "municipio").trim().replace(/\s+/g, "_");
  const dateStr = new Date().toISOString().slice(0, 10);
  doc.save(`relatorio_usuarios_${safeCity}_${dateStr}.pdf`);
}

