import { CamData } from "../types";
import { MouseEvent, RefObject} from "react";

interface VideoDisplayProps {
    frameData: CamData | null;
    imageRef: RefObject<HTMLImageElement>;
    canvasRef: RefObject<HTMLCanvasElement>;
    imageSize: { width: number; height: number };
    setImageSize: ({ width, height }: { width: number; height: number }) => void;
    handleMouseDown: (e: MouseEvent<HTMLCanvasElement>) => void;
    handleMouseMove: (e: MouseEvent<HTMLCanvasElement>) => void;
    handleMouseUp: (e: MouseEvent<HTMLCanvasElement>) => void;
}

function VideoDisplay({ frameData, imageRef, canvasRef, imageSize, setImageSize, handleMouseDown, handleMouseMove, handleMouseUp }: VideoDisplayProps) {
    return (
        <div className="video-container">
            {frameData && (
                <>
                    <img ref={imageRef} id="video-frame" src={frameData.image_data} alt={`Frame ${frameData.frame_number}`} onLoad={(e) => setImageSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })} />
                    <canvas ref={canvasRef} id="bbox-canvas" width={imageSize.width} height={imageSize.height} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
                </>
            )}
            {!frameData && <div className="loading-placeholder">Loading frame...</div>}
        </div>
    );
}

export default VideoDisplay;