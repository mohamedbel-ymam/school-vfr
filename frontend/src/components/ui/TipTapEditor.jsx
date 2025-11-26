import React, { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";

export default function TipTapEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: true,
      }),
      Image,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value]);

  if (!editor) return null;

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-2 border-b bg-slate-50">

        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`px-2 py-1 border rounded ${editor.isActive("bold") && "bg-blue-200"}`}
        >
          Gras
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`px-2 py-1 border rounded ${editor.isActive("italic") && "bg-blue-200"}`}
        >
          Italique
        </button>

        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`px-2 py-1 border rounded ${editor.isActive("underline") && "bg-blue-200"}`}
        >
          Souligné
        </button>

        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`px-2 py-1 border rounded ${editor.isActive("bulletList") && "bg-blue-200"}`}
        >
          Liste
        </button>

        <button
          onClick={() => {
            const url = prompt("Insérer un lien URL :");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          className="px-2 py-1 border rounded"
        >
          Lien
        </button>

        <button
          onClick={() => {
            const url = prompt("URL de l'image :");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
          className="px-2 py-1 border rounded"
        >
          Image
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`px-2 py-1 border rounded ${editor.isActive({ textAlign: "left" }) && "bg-blue-200"}`}
        >
          Gauche
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`px-2 py-1 border rounded ${editor.isActive({ textAlign: "center" }) && "bg-blue-200"}`}
        >
          Centre
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`px-2 py-1 border rounded ${editor.isActive({ textAlign: "right" }) && "bg-blue-200"}`}
        >
          Droite
        </button>
      </div>

      {/* Editor Area */}
      <EditorContent editor={editor} className="p-3 min-h-[150px]" />
    </div>
  );
}
