import { useState } from "react";
import UploadForm from "./components/UploadForm";
import VideoPlayer from "./components/VideoPlayer";

function App() {
  const [data, setData] = useState(null);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Bilingual Subtitles App</h1>
      {!data && <UploadForm onProcessed={setData} />}
      {data && (
        <VideoPlayer videoUrl={data.videoUrl} subtitleUrl={data.subtitleUrl} />
      )}
    </div>
  );
}

export default App;
