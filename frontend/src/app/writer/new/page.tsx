"use client";

import { useState, useCallback } from "react";
import { useAccount } from "wagmi";
import { ConnectWallet } from "@/components/ConnectWallet";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Markdown } from "tiptap-markdown";
import {
  Bold, Italic, Heading2, Heading3,
  Quote, Code, Minus,
} from "lucide-react";

const CATEGORIES = ["Economics", "Web3", "DeFi", "Cryptography", "Development", "Yield", "Infrastructure", "Opinion"];

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) return null;

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 bg-[#fbfbfd] border-b border-black/[0.06] sticky top-[48px] z-40">
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-1.5 rounded-md text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-colors ${editor.isActive('heading', { level: 2 }) ? 'bg-black/[0.08] text-[#1d1d1f]' : ''}`}
        title="Heading 2"
      ><Heading2 size={18} strokeWidth={2.5}/></button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={`p-1.5 rounded-md text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-colors ${editor.isActive('heading', { level: 3 }) ? 'bg-black/[0.08] text-[#1d1d1f]' : ''}`}
        title="Heading 3"
      ><Heading3 size={18} strokeWidth={2.5}/></button>
      
      <div className="w-[1px] h-4 bg-black/[0.1] mx-1" />
      
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={`p-1.5 rounded-md text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-colors ${editor.isActive('bold') ? 'bg-black/[0.08] text-[#1d1d1f]' : ''}`}
        title="Bold"
      ><Bold size={18} strokeWidth={2.5}/></button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={`p-1.5 rounded-md text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-colors ${editor.isActive('italic') ? 'bg-black/[0.08] text-[#1d1d1f]' : ''}`}
        title="Italic"
      ><Italic size={18} strokeWidth={2.5}/></button>
      <button
        onClick={() => editor.chain().focus().toggleCode().run()}
        className={`p-1.5 rounded-md text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-colors ${editor.isActive('code') ? 'bg-black/[0.08] text-[#1d1d1f]' : ''}`}
        title="Inline Code"
      ><Code size={18} strokeWidth={2.5}/></button>
      
      <div className="w-[1px] h-4 bg-black/[0.1] mx-1" />

      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-1.5 rounded-md text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-colors ${editor.isActive('blockquote') ? 'bg-black/[0.08] text-[#1d1d1f]' : ''}`}
        title="Quote"
      ><Quote size={18} strokeWidth={2.5}/></button>
      <button
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        className={`p-1.5 rounded-md text-[#6e6e73] hover:text-[#1d1d1f] hover:bg-black/[0.04] transition-colors`}
        title="Divider"
      ><Minus size={18} strokeWidth={2.5}/></button>
    </div>
  );
};

export default function NewArticlePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Economics");
  const [price, setPrice] = useState("0.001");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'Tell your story...',
      }),
      Markdown,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose-custom max-w-none focus:outline-none',
      },
    },
    immediatelyRender: false,
  });

  const getWordCount = () => {
    if (!editor) return 0;
    const text = editor.getText();
    return text.trim().split(/\s+/).filter(Boolean).length;
  };

  const wordCount = getWordCount();
  const estReadTime = Math.max(1, Math.round(wordCount / 200));

  const handlePublish = useCallback(async () => {
    if (!editor) return;
    // @ts-expect-error - tiptap-markdown doesn't fully type the storage context
    const markdownContent = editor.storage.markdown.getMarkdown();
    const textContent = editor.getText();

    if (!title.trim()) { setError("Title is required"); return; }
    if (!textContent.trim()) { setError("Write some content first"); return; }
    if (!isConnected) { setError("Connect to publish"); return; }

    setError("");
    setPublishing(true);

    try {
      const res = await fetch("/api/articles/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          author: "Anonymous Writer",
          authorAddress: address,
          category,
          excerpt: textContent.trim().slice(0, 140) + "…",
          readTime: `${estReadTime} min`,
          price,
          content: markdownContent,
        }),
      });

      if (!res.ok) throw new Error(await res.text());

      const { slug } = await res.json();
      router.push(`/read/${slug}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Publish failed");
      setPublishing(false);
    }
  }, [title, editor, category, price, estReadTime, address, isConnected, router]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="fixed top-0 w-full z-50 nav-glass">
        <div className="max-w-[800px] mx-auto px-6 h-12 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-[15px] font-bold text-[#1d1d1f] tracking-tight">HumbleHumansHub</Link>
            <Link href="/writer" className="text-[13px] text-[#6e6e73] hover:text-[#1d1d1f] transition-colors">‹ Dashboard</Link>
          </div>
          <div className="flex items-center gap-3">
            {error && <span className="text-[12px] text-red-500">{error}</span>}
            <ConnectWallet />
            <button
              onClick={handlePublish}
              disabled={publishing || !title.trim()}
              className="btn-accent py-1.5 px-4 disabled:opacity-40 text-[13px] rounded-full"
              id="publish-btn"
            >
              {publishing ? "Publishing…" : `Publish at $${price} per read`}
            </button>
          </div>
        </div>
      </nav>

      <div className="flex-1 pt-[48px] flex flex-col max-w-[800px] mx-auto w-full">
        {/* Toolbar */}
        <MenuBar editor={editor} />

        {/* Editor Area */}
        <div className="px-6 py-12 flex-1">
          {/* Title Area */}
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full text-[40px] md:text-[48px] font-bold text-[#1d1d1f] placeholder-[#d2d2d7] bg-transparent border-0 outline-none leading-tight tracking-tight mb-8"
            style={{ fontFamily: "Inter, sans-serif" }}
            id="article-title-input"
          />

          {/* Metadata Row */}
          <div className="mb-10 flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-[14px] text-[#86868b]">Category:</span>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="text-[13px] font-medium text-[#1d1d1f] bg-[#f5f5f7] border-0 rounded-full px-4 py-1.5 outline-none hover:bg-black/[0.06] transition-colors cursor-pointer appearance-none"
                style={{ backgroundImage: "none" }}
                id="category-select"
              >
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            
            <div className="h-4 w-[1px] bg-black/[0.1] hidden md:block" />

            <div className="flex items-center gap-3">
              <span className="text-[14px] text-[#86868b]">Reader price:</span>
              <select
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="text-[13px] font-medium text-[#1a8917] bg-[#1a8917]/10 border-0 rounded-full px-4 py-1.5 outline-none hover:bg-[#1a8917]/20 transition-colors cursor-pointer appearance-none"
                style={{ backgroundImage: "none" }}
                id="price-select"
              >
                <option value="0.001">$0.001</option>
                <option value="0.005">$0.005</option>
                <option value="0.01">$0.010</option>
              </select>
            </div>
          </div>

          {/* Tiptap WYSIWYG Editor */}
          <div className="text-[18px] md:text-[20px] leading-[1.8] text-[#1d1d1f] font-serif">
             <EditorContent editor={editor} />
          </div>
        </div>

        {/* Bottom stats */}
        <div className="px-6 pb-12 text-[13px] text-[#86868b] flex gap-4">
          <span>{wordCount} words</span>
          <span>~{estReadTime} min read</span>
        </div>
      </div>
    </div>
  );
}
