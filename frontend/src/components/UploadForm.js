import { useState } from "react";

export default function UploadForm({ onProcessed }) {
  const [url, setUrl] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    const response = await fetch("http://127.0.0.1:5000/subtitles/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    if (response.ok) {
      const data = await response.json();
      // O backend retorna o caminho do SRT e do vídeo processado
      onProcessed(data);
    } else {
      alert("Erro ao processar o vídeo");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <input
        type="text"
        placeholder="Cole a URL do vídeo do YouTube"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        className="border p-2 rounded"
      />
      <button type="submit" className="bg-purple-600 text-white p-2 rounded">
        Processar
      </button>
    </form>
  );
}
