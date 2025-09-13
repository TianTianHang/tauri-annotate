import { CamData } from "../types";
import { MouseEvent, RefObject, useEffect, useState, memo } from "react";

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
    const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(null);

    useEffect(() => {
        if (!frameData?.image_data) {
            setCurrentImageSrc(null);
            return;
        }

        // Preload the image
        const img = new Image();
        img.src = frameData.image_data;
        img.onload = () => {
            // Once loaded, update the src to display the new image
            setCurrentImageSrc(frameData.image_data);
            // Also update the canvas size, checking if it changed
            if (imageSize.width !== img.naturalWidth || imageSize.height !== img.naturalHeight) {
                setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
            }
        };
        img.onerror = () => {
            console.error("Failed to load image for frame:", frameData.frame_number);
            // Optional: set a placeholder or keep the old image
        };
    }, [frameData, imageSize, setImageSize]);


    return (
        <div className="video-container">
            {currentImageSrc && frameData ? (
                <>
                    <img ref={imageRef} id="video-frame" src={currentImageSrc} alt={`Frame ${frameData.frame_number}`} />
                    <canvas ref={canvasRef} id="bbox-canvas" width={imageSize.width} height={imageSize.height} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp} />
                </>
            ) : (
                <div className="loading-placeholder">Loading frame...</div>
            )}
        </div>
    );
}

export default memo(VideoDisplay);
