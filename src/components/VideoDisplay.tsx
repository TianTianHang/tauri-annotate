import { CamData } from "../types";
import { MouseEvent, RefObject, useEffect, useState, memo, WheelEvent } from "react";
import ZoomControls from "./ZoomControls";

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
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isPanning, setIsPanning] = useState(false);
    const [panStart, setPanStart] = useState({ x: 0, y: 0 });

    useEffect(() => {
        if (!frameData?.image_data) {
            setCurrentImageSrc(null);
            return;
        }

        const img = new Image();
        img.src = frameData.image_data;
        img.onload = () => {
            setCurrentImageSrc(frameData.image_data);
            if (imageSize.width !== img.naturalWidth || imageSize.height !== img.naturalHeight) {
                setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
            }
        };
        img.onerror = () => {
            console.error("Failed to load image for frame:", frameData.frame_number);
        };
    }, [frameData, imageSize, setImageSize]);

    const resetZoomAndPan = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    const onWheel = (e: WheelEvent<HTMLDivElement>) => {
        e.preventDefault();
        const zoomFactor = 1.1;
        const newZoom = e.deltaY < 0 ? zoom * zoomFactor : zoom / zoomFactor;
        setZoom(Math.max(1, newZoom));
    };

    const wrappedHandleMouseDown = (e: MouseEvent<HTMLCanvasElement>) => {
        if (e.altKey || e.button === 1) { // Alt key or middle mouse for panning
            setIsPanning(true);
            setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
            e.preventDefault();
        } else {
            handleMouseDown(e);
        }
    };

    const wrappedHandleMouseMove = (e: MouseEvent<HTMLCanvasElement>) => {
        if (isPanning) {
            setPan({
                x: e.clientX - panStart.x,
                y: e.clientY - panStart.y,
            });
        } else {
            handleMouseMove(e);
        }
    };

    const wrappedHandleMouseUp = (e: MouseEvent<HTMLCanvasElement>) => {
        if (isPanning) {
            setIsPanning(false);
        } else {
            handleMouseUp(e);
        }
    };

    // Reset pan when zoom is reset to 1
    useEffect(() => {
        if (zoom === 1) {
            setPan({ x: 0, y: 0 });
        }
    }, [zoom]);

    return (
        <div className="video-display-wrapper">
            <div
                className="video-container"
                onWheel={onWheel}
                style={{ 
                    overflow: 'hidden', 
                    cursor: isPanning ? 'grabbing' : 'default',
                }}
            >
                <div
                    style={{
                        transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
                        width: '100%',
                        height: '100%',
                        display: 'grid',
                        placeItems: 'center',
                    }}
                >
                    {currentImageSrc && frameData ? (
                        <>
                            <img 
                                ref={imageRef} 
                                id="video-frame" 
                                src={currentImageSrc} 
                                alt={`Frame ${frameData.frame_number}`}
                            />
                            <canvas
                                ref={canvasRef}
                                id="bbox-canvas"
                                width={imageSize.width}
                                height={imageSize.height}
                                onMouseDown={wrappedHandleMouseDown}
                                onMouseMove={wrappedHandleMouseMove}
                                onMouseUp={wrappedHandleMouseUp}
                                onMouseLeave={wrappedHandleMouseUp} // Keep this to prevent sticky drawing
                                style={{ 
                                    cursor: isPanning ? 'grabbing' : 'crosshair' 
                                }}
                            />
                        </>
                    ) : (
                        <div className="loading-placeholder">Loading frame...</div>
                    )}
                </div>
            </div>
            <ZoomControls zoom={zoom} setZoom={setZoom} resetZoomAndPan={resetZoomAndPan} />
        </div>
    );
}

export default memo(VideoDisplay);
