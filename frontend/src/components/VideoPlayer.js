import { useEffect, useRef } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";

export default function VideoPlayer({ videoUrl, subtitleUrl }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!playerRef.current) {
      playerRef.current = videojs(videoRef.current, {
        controls: true,
        autoplay: false,
        preload: "auto",
        fluid: true,
      });

      if (subtitleUrl) {
        playerRef.current.addRemoteTextTrack(
          {
            src: subtitleUrl,
            kind: "subtitles",
            srclang: "pt-en",
            label: "Português + Inglês",
            default: true,
          },
          false
        );
      }
    } else {
      playerRef.current.src({ src: videoUrl, type: "video/mp4" });
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [videoUrl, subtitleUrl]);

  return (
    <div>
      <video ref={videoRef} className="video-js vjs-big-play-centered" />
    </div>
  );
}
