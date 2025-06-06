import React, { useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Superscript from '@tiptap/extension-superscript';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import './MyEditor.css';

interface MyEditorProps {
  content?: string;
  onChange?: (content: string) => void;
}

// Extensão personalizada para imagens redimensionáveis
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) {
            return {};
          }
          return {
            width: attributes.width
          };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) {
            return {};
          }
          return {
            height: attributes.height
          };
        },
      },
      textAlign: {
        default: 'left',
        parseHTML: element => element.getAttribute('data-text-align') || 'left',
        renderHTML: attributes => {
          return {
            'data-text-align': attributes.textAlign
          };
        },
      },
    };
  },
  addNodeView() {
    return ({ node, HTMLAttributes, getPos, editor }) => {
      const dom = document.createElement('div');
      dom.className = 'resizable-image-container';
      dom.setAttribute('data-text-align', node.attrs.textAlign || 'left');

      const img = document.createElement('img');
      img.src = node.attrs.src;
      img.alt = node.attrs.alt || '';
      img.className = 'resizable-image';

      const handle = document.createElement('div');
      handle.className = 'resize-handle';

      dom.appendChild(img);
      dom.appendChild(handle);

      // Function to update alignment based on the parent block's textAlign attribute
      const applyAlignment = (state, pos) => {
        if (typeof pos === 'number') {
          const resolvedPos = state.doc.resolve(pos);
          const parentBlock = resolvedPos.parent;
          const textAlign = parentBlock?.attrs?.textAlign || 'left';
          dom.setAttribute('data-text-align', textAlign);
        }
      };

      // Initial alignment setup
      requestAnimationFrame(() => applyAlignment(editor.state, getPos()));

      let isResizing = false;
      let startX: number;
      let startY: number;
      let startWidth: number;
      let startHeight: number;

      const onMouseDown = (e: MouseEvent) => {
        isResizing = true;
        startX = e.clientX;
        startY = e.clientY;
        startWidth = img.offsetWidth;
        startHeight = img.offsetHeight;
        img.style.cursor = 'nwse-resize';
        e.preventDefault();
      };

      const onMouseMove = (e: MouseEvent) => {
        if (!isResizing) return;

        const width = Math.max(50, startWidth + (e.clientX - startX));
        const height = Math.max(50, startHeight + (e.clientY - startY));

        img.style.width = `${width}px`;
        img.style.height = `${height}px`;
      };

      const onMouseUp = () => {
        if (!isResizing) return;
        isResizing = false;
        img.style.cursor = 'default';

        const pos = getPos();
        if (typeof pos === 'number') {
          const { view } = editor;
          const { state } = view;
          const tr = state.tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            width: `${img.offsetWidth}px`, // Save the final dimensions as attributes
            height: `${img.offsetHeight}px`,
          });
          view.dispatch(tr);
        }
      };

      handle.addEventListener('mousedown', onMouseDown);
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);

      return {
        dom,
        destroy: () => {
          handle.removeEventListener('mousedown', onMouseDown);
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
        },
        update: (newNode) => {
          if (newNode.type === node.type) {
            if (newNode.attrs.width !== node.attrs.width) {
              img.style.width = newNode.attrs.width;
            }
            if (newNode.attrs.height !== node.attrs.height) {
              img.style.height = newNode.attrs.height;
            }
            applyAlignment(editor.state, getPos());
            return true;
          }
          return false;
        },
      };
    };
  },
});

const MyEditor: React.FC<MyEditorProps> = ({ content = '', onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Superscript,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph', 'image'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
      Placeholder.configure({
        placeholder: 'Digite o conteúdo aqui...'
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          if (item.type.indexOf('image') === 0) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                const url = e.target?.result as string;
                if (editor && url) {
                  editor.chain().focus().setImage({ 
                    src: url, 
                    alt: 'Imagem colada'
                  }).run();
                }
              };
              reader.readAsDataURL(file);
            }
            return true;
          }
        }
        return false;
      },
    },
  });

  // Função de teste para redimensionamento de imagem
  const testImageResize = useCallback(() => {
    if (!editor) return;
    
    // URL de uma imagem de teste
    const testImageUrl = 'https://picsum.photos/200/300';
    
    // Insere a imagem no editor
    editor.chain().focus().setImage({ 
      src: testImageUrl,
      alt: 'Imagem de teste'
    }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true; // Permite selecionar múltiplas imagens
    input.onchange = async () => {
      const files = input.files;
      if (files) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const reader = new FileReader();
          reader.onload = (e) => {
            const url = e.target?.result as string;
            if (editor && url) {
              editor.chain().focus().setImage({ 
                src: url, 
                alt: file.name || 'Image'
              }).run();
            }
          };
          reader.readAsDataURL(file);
        }
      }
    };
    input.click();
  }, [editor]);

  const toggleSuperscript = useCallback(() => {
    editor?.chain().focus().toggleSuperscript().run();
  }, [editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className="tiptap-editor">
      <div className="editor-toolbar">
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleBold().run();
          }}
          className={editor.isActive('bold') ? 'is-active' : ''}
          title="Negrito"
        >
          B
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleItalic().run();
          }}
          className={editor.isActive('italic') ? 'is-active' : ''}
          title="Itálico"
        >
          I
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleUnderline().run();
          }}
          className={editor.isActive('underline') ? 'is-active' : ''}
          title="Sublinhado"
        >
          U
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleSuperscript();
          }}
          className={editor.isActive('superscript') ? 'is-active' : ''}
          title="Sobrescrito"
        >
          x²
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().setTextAlign('left').run();
          }}
          className={editor.isActive({ textAlign: 'left' }) ? 'is-active' : ''}
          title="Align Left"
        >
          ←
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().setTextAlign('center').run();
          }}
          className={editor.isActive({ textAlign: 'center' }) ? 'is-active' : ''}
          title="Align Center"
        >
          ↔
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().setTextAlign('right').run();
          }}
          className={editor.isActive({ textAlign: 'right' }) ? 'is-active' : ''}
          title="Align Right"
        >
          →
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleBulletList().run();
          }}
          className={editor.isActive('bulletList') ? 'is-active' : ''}
          title="Lista com marcadores"
        >
          •
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            editor.chain().focus().toggleOrderedList().run();
          }}
          className={editor.isActive('orderedList') ? 'is-active' : ''}
          title="Lista numerada"
        >
          1.
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            addImage();
          }}
          title="Inserir imagem"
        >
          🖼️
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            testImageResize();
          }}
          title="Testar redimensionamento"
        >
          📏
        </button>
      </div>
      <EditorContent editor={editor} className="editor-content" />
    </div>
  );
};

export { MyEditor, ResizableImage }; 