import { api } from '@/lib/api';
import type { AxiosRequestConfig } from 'axios';

export interface CityBrandingPresigned {
  logo_url: string | null;
  letterhead_image_url: string | null;
  letterhead_pdf_url: string | null;
}

export interface CityBrandingResponse {
  city_id: string;
  logo_object_key: string | null;
  letterhead_image_object_key: string | null;
  letterhead_pdf_object_key: string | null;
  presigned: CityBrandingPresigned;
}

export interface UploadLogoResponse {
  mensagem: string;
  logo_object_key: string;
  presigned: string;
}

export interface UploadLetterheadPresigned {
  letterhead_image_url: string;
  letterhead_pdf_url: string | null;
}

export interface UploadLetterheadResponse {
  mensagem: string;
  letterhead_image_object_key: string;
  letterhead_pdf_object_key: string | null;
  presigned: UploadLetterheadPresigned;
}

export interface DeleteBrandingResponse {
  mensagem: string;
  city_id: string;
}

function cityMeta(cityId: string): Pick<AxiosRequestConfig, 'meta'> {
  return { meta: { cityId } };
}

export async function getCityBranding(cityId: string): Promise<CityBrandingResponse> {
  const { data } = await api.get<CityBrandingResponse>(`/city/${cityId}/branding`, cityMeta(cityId));
  return data;
}

export async function uploadCityLogo(cityId: string, file: File, replace: boolean): Promise<UploadLogoResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const q = replace ? '?replace=true' : '';
  const { data } = await api.post<UploadLogoResponse>(`/city/${cityId}/branding/logo${q}`, formData, {
    ...cityMeta(cityId),
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function uploadCityLetterhead(
  cityId: string,
  file: File,
  options: { replace: boolean; storePdf: boolean }
): Promise<UploadLetterheadResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const params = new URLSearchParams();
  if (options.replace) params.set('replace', 'true');
  if (!options.storePdf) params.set('store_pdf', 'false');
  const q = params.toString() ? `?${params.toString()}` : '';
  const { data } = await api.post<UploadLetterheadResponse>(
    `/city/${cityId}/branding/letterhead${q}`,
    formData,
    {
      ...cityMeta(cityId),
      headers: { 'Content-Type': 'multipart/form-data' },
    }
  );
  return data;
}

export async function deleteCityBranding(
  cityId: string,
  flags: { logo: boolean; letterhead: boolean }
): Promise<DeleteBrandingResponse> {
  const params = new URLSearchParams();
  if (flags.logo) params.set('logo', 'true');
  if (flags.letterhead) params.set('letterhead', 'true');
  const q = params.toString() ? `?${params.toString()}` : '';
  const { data } = await api.delete<DeleteBrandingResponse>(`/city/${cityId}/branding${q}`, cityMeta(cityId));
  return data;
}

export function getBrandingErrorMessage(err: unknown): string {
  const ax = err as { response?: { data?: { erro?: string; message?: string } } };
  const d = ax?.response?.data;
  return d?.erro || d?.message || 'Não foi possível concluir a operação.';
}
