import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Shuffle, Camera, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { IntType } from "three/src/constants.js";

interface SegmentedPerson {
  id: string;
  polygon: Array<[number, number]>; // Array of [x, y] coordinates
  bbox: { x: number; y: number; width: number; height: number }; // Bounding box for positioning
  confidence: number;
  area: number;
}

interface ShuffleState {
  isShuffling: boolean;
  selectedId: string | null;
  highlightedId: string | null;
}

export default function Index() {
  const [image, setImage] = useState<string | null>(null);
  const [people, setPeople] = useState<SegmentedPerson[]>([]);
  const [shuffleState, setShuffleState] = useState<ShuffleState>({
    isShuffling: false,
    selectedId: null,
    highlightedId: null,
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  // Simulate person instance segmentation (in a real app, you'd use models like Mask R-CNN, YOLACT, etc.)
  const segmentPeople = useCallback(async (imageElement: HTMLImageElement, file: File) => {
    setIsProcessing(true);

    try {
      let width = imageElement.naturalWidth;
      let height = imageElement.naturalHeight;
      const threshold = 0;

      // ⬇️ Limit size to 768px max on either dimension
      const maxDim = 1024;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("width", String(width));
      formData.append("height", String(height));
      formData.append("threshold", String(0));

      const response = await fetch("https://lucky-photo-picker-319016205501.asia-southeast2.run.app/detect/", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      // Set the resized base64 image returned from server
      setImage(`data:image/jpeg;base64,${data.original_image}`);

      // Improved contour tracing for mask polygon with simplification
      const maskToPolygon = (mask: number[][]): Array<[number, number]> => {
        const h = mask.length;
        const w = mask[0].length;
        const visited = Array.from({ length: h }, () => Array(w).fill(false));
        const points: Array<[number, number]> = [];
        const directions = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];
        
        // Find starting point (top-left mask pixel)
        let startX = -1, startY = -1;
        outer: for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (mask[y][x] === 1) {
              startX = x;
              startY = y;
              break outer;
            }
          }
        }
        
        if (startX === -1) return []; // No mask found
        
        let x = startX, y = startY;
        let dir = 0; // Start moving right
        
        // Trace contour using Moore neighborhood algorithm
        do {
          points.push([x, y]);
          visited[y][x] = true;
          
          // Check 8 neighbors starting from current direction
          let newDir = (dir + 5) % 8; // Start checking counter-clockwise
          let found = false;
          
          for (let i = 0; i < 8; i++) {
            const nd = (newDir + i) % 8;
            const dx = directions[nd][0];
            const dy = directions[nd][1];
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[ny][nx] === 1) {
              x = nx;
              y = ny;
              dir = nd;
              found = true;
              break;
            }
          }
          
          if (!found) break; // No neighbors found
        } while (x !== startX || y !== startY);
        
        // Simplify polygon while preserving shape
        const simplifiedPoints: Array<[number, number]> = [];
        if (points.length > 2) {
          simplifiedPoints.push(points[0]);
          for (let i = 1; i < points.length - 1; i++) {
            const [x0, y0] = points[i-1];
            const [x1, y1] = points[i];
            const [x2, y2] = points[i+1];
            
            // Only keep point if direction changes significantly
            const dx1 = x1 - x0;
            const dy1 = y1 - y0;
            const dx2 = x2 - x1;
            const dy2 = y2 - y1;
            const cross = dx1 * dy2 - dy1 * dx2;
            
            if (Math.abs(cross) > 0.5) {
              simplifiedPoints.push(points[i]);
            }
          }
          simplifiedPoints.push(points[points.length-1]);
        }
        
        return simplifiedPoints.length >= 3 ? simplifiedPoints : [];
      };

      const segmented = data.masks.map((maskData: any, i: number) => {
        const polygon = maskToPolygon(maskData.mask);
        const xs = polygon.map(p => p[0]);
        const ys = polygon.map(p => p[1]);

        const minX = xs.reduce((a, b) => Math.min(a, b), Infinity);
        const maxX = xs.reduce((a, b) => Math.max(a, b), -Infinity);
        const minY = ys.reduce((a, b) => Math.min(a, b), Infinity);
        const maxY = ys.reduce((a, b) => Math.max(a, b), -Infinity);

        return {
          id: `person-${i}`,
          polygon,
          bbox: {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
          },
          confidence: 1,
          area: (maxX - minX) * (maxY - minY)
        };
      });

      setPeople(segmented);
    } catch (err) {
      console.error("Segmentation error:", err);
    } finally {
      setIsProcessing(false);
    }
  }, []);


  const handleImageUpload = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImage(result);
        setPeople([]);
        setUploadedFile(file);  // ✅ Save the file for later use
        setShuffleState({ isShuffling: false, selectedId: null, highlightedId: null });
        
        // Process image after it loads
        setTimeout(() => {
          if (imageRef.current) {
            segmentPeople(imageRef.current, file);
          }
        }, 100);
      };
      reader.readAsDataURL(file);
    }
  }, [segmentPeople]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageUpload(file);
    }
  }, [handleImageUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const shufflePeople = useCallback(() => {
    if (people.length === 0) return;

    setShuffleState(prev => ({ ...prev, isShuffling: true, selectedId: null }));

    let shuffleCount = 0;
    const maxShuffles = 15;

    const shuffleInterval = setInterval(() => {
      const randomPerson = people[Math.floor(Math.random() * people.length)];
      setShuffleState(prev => ({ ...prev, highlightedId: randomPerson.id }));

      // Play shuffle sound
      if (shuffleCount < maxShuffles - 2) {
        const shuffleSound = new Audio('/shuffle.mp3');
        shuffleSound.play().catch(e => console.error('Failed to play shuffle sound:', e));
      }

      shuffleCount++;
      if (shuffleCount >= maxShuffles) {
        clearInterval(shuffleInterval);
        const finalPerson = people[Math.floor(Math.random() * people.length)];
        setShuffleState({
          isShuffling: false,
          selectedId: finalPerson.id,
          highlightedId: null,
        });
        
        // Play result sound
        const resultSound = new Audio('/result.mp3');
        resultSound.play().catch(e => console.error('Failed to play result sound:', e));
      }
    }, 150);
  }, [people]);

  const resetSelection = useCallback(() => {
    setShuffleState({ isShuffling: false, selectedId: null, highlightedId: null });
  }, []);

  const openNewImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const updateImageSize = useCallback(() => {
    if (imageRef.current) {
      setImageSize({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight
      });
    }
  }, []);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);  // Uploaded file state
  const [cameraState, setCameraState] = useState<'inactive' | 'starting' | 'active' | 'error'>('inactive');
  const videoRef = useRef<HTMLVideoElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  
  // Start camera handler with reset
  const startCameraHandler = useCallback(async () => {
    // Reset camera state before starting new session
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    setCameraState('starting');
    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        
        // Wait for video to be ready
        await new Promise<void>((resolve) => {
          if (videoRef.current) {
            videoRef.current.onloadedmetadata = () => {
              setCameraState('active');
              resolve();
            };
          }
        });
      }
    } catch (err) {
      console.error("Camera error:", err);
      setCameraState('error');
      alert("Could not access camera. Please ensure you've granted camera permissions.");
    }
  }, []);

  // Stop camera handler
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraState('inactive');
  }, []);

  // Capture image from camera
  const captureImage = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            setCameraState('inactive');
            handleImageUpload(file);
          }
        }, 'image/jpeg', 0.95);
      }
    }
  }, [handleImageUpload]);

  useEffect(() => {
    const handleResize = () => updateImageSize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [updateImageSize]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <div className="flex items-center justify-center gap-2 md:gap-3 mb-4">
            <div className="p-2 md:p-3 bg-primary/10 rounded-full">
              <Camera className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            </div>
            <h1 className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              PhotoPicker
            </h1>
          </div>
          <p className="text-muted-foreground text-sm md:text-lg max-w-md mx-auto px-4">
            Upload an image to segment objects and randomly select one with our smart shuffling and detection algorithm
          </p>
        </div>

        {!image ? (
          /* Upload Area */
          <Card className="max-w-2xl mx-auto">
            <div
              className={cn(
                "border-2 border-dashed border-border rounded-lg p-6 md:p-12 text-center transition-all duration-200",
                isDragging && "border-primary bg-primary/5 scale-105"
              )}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {cameraState === 'starting' || cameraState === 'active' ? (
                <div className="flex flex-col items-center gap-4">
                  <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {cameraState === 'starting' && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="text-center">
                          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                          <p className="text-white">Starting camera...</p>
                        </div>
                      </div>
                    )}
                    {cameraState === 'active' && (
                      <div className="absolute inset-0 flex items-end justify-center pb-4">
                        <Button
                          onClick={captureImage}
                          size="lg"
                          className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
                        >
                          <span className="sr-only">Capture</span>
                          <div className="w-10 h-10 bg-white rounded-full" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    onClick={stopCamera}
                    size="lg"
                    className="gap-2"
                  >
                    Cancel
                  </Button>
                </div>
              ) : cameraState === 'error' ? (
                <div className="flex flex-col items-center gap-4 p-6 bg-red-50 rounded-lg">
                  <div className="text-red-500 font-medium">Camera Error</div>
                  <p className="text-red-700 text-center">
                    Could not access camera. Please check permissions and try again.
                  </p>
                  <div className="flex gap-3">
                    <Button
                      onClick={startCameraHandler}
                      variant="secondary"
                    >
                      Retry Camera
                    </Button>
                    <Button onClick={openNewImage}>
                      Choose Image Instead
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 md:gap-4">
                  <div className="p-3 md:p-4 bg-primary/10 rounded-full">
                    <Upload className="w-8 h-8 md:w-12 md:h-12 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg md:text-xl font-semibold mb-2">Drop your image here</h3>
                    <p className="text-muted-foreground mb-4 text-sm md:text-base">
                      or choose from device or camera
                    </p>
                    <div className="flex gap-3">
                      <Button onClick={openNewImage} size="lg" className="gap-2">
                        <Upload className="w-4 h-4 md:w-5 md:h-5" />
                        Choose Image
                      </Button>
                      <Button
                        onClick={startCameraHandler}
                        variant="secondary"
                        size="lg"
                        className="gap-2"
                      >
                        <Camera className="w-4 h-4 md:w-5 md:h-5" />
                        Use Camera
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        ) : (
          /* Image Analysis Area */
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 md:gap-3 flex-wrap">
                <Badge variant="secondary" className="text-xs md:text-sm">
                  {people.length} objects segmented
                </Badge>
                {shuffleState.selectedId && (
                  <Badge className="bg-accent text-accent-foreground text-xs md:text-sm">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Selected!
                  </Badge>
                )}
              </div>
              <div className="flex gap-2 md:gap-3 flex-wrap">
                <Button
                  variant="outline"
                  onClick={resetSelection}
                  disabled={isProcessing || shuffleState.isShuffling}
                  size="sm"
                  className="md:h-10"
                >
                  <RefreshCw className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">Reset</span>
                </Button>
                <Button
                  onClick={shufflePeople}
                  disabled={people.length === 0 || isProcessing || shuffleState.isShuffling}
                  className="gap-1 md:gap-2"
                  size="sm"
                >
                  <Shuffle className={cn("w-4 h-4", shuffleState.isShuffling && "animate-spin")} />
                  {shuffleState.isShuffling ? "Shuffling..." : "Shuffle"}
                </Button>
                <Button variant="secondary" onClick={openNewImage} size="sm" className="md:h-10 gap-1">
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">New Image</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setImage(null);
                    setPeople([]);
                    setShuffleState({ isShuffling: false, selectedId: null, highlightedId: null });
                    startCameraHandler();
                  }}
                  size="sm"
                  className="md:h-10 gap-1"
                >
                  <Camera className="w-4 h-4" />
                  <span className="hidden sm:inline">Camera</span>
                </Button>
              </div>
            </div>

            {/* Image Display */}
            <Card className="overflow-hidden">
              <div className="relative">
                <img
                  ref={imageRef}
                  src={image}
                  alt="Uploaded"
                  className="w-full h-auto max-h-[600px] object-contain"
                  onLoad={() => {
                    if (imageRef.current) {
                      updateImageSize();
                      if (people.length === 0) {
                        segmentPeople(imageRef.current, uploadedFile);
                      }
                    }
                  }}
                />
                
                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                      <p className="text-sm text-muted-foreground">Segmenting objects...</p>
                    </div>
                  </div>
                )}

                {/* Segmentation Overlays */}
                {people.map((person) => {
                  const isSelected = shuffleState.selectedId === person.id;
                  const isHighlighted = shuffleState.highlightedId === person.id;

                  if (!imageRef.current) return null;

                  // Get the displayed image dimensions (actual rendered size)
                  const imgElement = imageRef.current;
                  // const displayedWidth = imgElement.offsetWidth;
                  // const displayedHeight = imgElement.offsetHeight;
                  // const naturalWidth = imgElement.naturalWidth;
                  // const naturalHeight = imgElement.naturalHeight;

                  // // Calculate scale factors for the displayed image vs natural size
                  // const scaleX = displayedWidth / naturalWidth;
                  // const scaleY = displayedHeight / naturalHeight;
                  const naturalWidth = imgElement.naturalWidth;
                  const naturalHeight = imgElement.naturalHeight;
                  const containerWidth = imgElement.offsetWidth;
                  const containerHeight = imgElement.offsetHeight;

                  const imageRatio = naturalWidth / naturalHeight;
                  const containerRatio = containerWidth / containerHeight;

                  let renderedWidth = containerWidth;
                  let renderedHeight = containerHeight;

                  if (imageRatio > containerRatio) {
                    // Image is wider than container — letterboxing top/bottom
                    renderedHeight = containerWidth / imageRatio;
                  } else {
                    // Image is taller than container — letterboxing left/right
                    renderedWidth = containerHeight * imageRatio;
                  }

                  // Offsets to center the image inside the container (object-contain behavior)
                  const offsetX = (containerWidth - renderedWidth) / 2;
                  const offsetY = (containerHeight - renderedHeight) / 2;

                  const scaleX = renderedWidth / naturalWidth;
                  const scaleY = renderedHeight / naturalHeight;


                  // Convert polygon coordinates to SVG coordinates
                  const polygonPoints = person.polygon
                  .map(([x, y]) => `${x * scaleX + offsetX},${y * scaleY + offsetY}`)
                  .join(" ");

                  return (
                    <div key={person.id} className="absolute inset-0">
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ zIndex: 10 }}
                        viewBox={`0 0 ${containerWidth} ${containerHeight}`}
                        width={containerWidth}
                        height={containerHeight}
                      >
                        <polygon
                          points={polygonPoints}
                          className={cn(
                            "transition-all duration-200",
                            isSelected && "fill-accent/70 stroke-accent stroke-2",
                            isHighlighted && "fill-primary/70 stroke-primary stroke-2 animate-pulse",
                            !isSelected && !isHighlighted && "fill-primary/50 stroke-primary/80 stroke-1"
                          )}
                          style={{
                            opacity: isSelected ? 0.8 : isHighlighted ? 0.9 : 0.7,
                            filter: isSelected ? 'drop-shadow(0 0 8px rgba(0, 185, 185, 0.7))' :
                                   isHighlighted ? 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.7))' : 'none'
                          }}
                        />
                      </svg>

                      {isSelected && (
                        <div
                          className="absolute transform -translate-x-1/2 -translate-y-full"
                          style={{
                            left: `${((person.bbox.x + person.bbox.width/2) * scaleX + offsetX)}px`,
                            top: `${(person.bbox.y * scaleY + offsetY)}px`,
                            zIndex: 20
                          }}
                        >
                          <Badge className="bg-accent text-accent-foreground text-xs whitespace-nowrap">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Selected Object!
                          </Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Card>

            {/* Results */}
            {shuffleState.selectedId && (
              <Card className="p-4 md:p-6 text-center bg-gradient-to-r from-accent/10 to-primary/10">
                <div className="flex items-center justify-center gap-2 md:gap-3 mb-4">
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                  <h3 className="text-lg md:text-xl font-semibold">Selection Complete!</h3>
                  <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-accent" />
                </div>
                <p className="text-muted-foreground mb-4 text-sm md:text-base">
                  The algorithm has selected an object from your image. Want to try again?
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button onClick={shufflePeople} className="gap-2">
                    <Shuffle className="w-4 h-4" />
                    Shuffle Again
                  </Button>
                  <Button variant="secondary" onClick={openNewImage}>
                    <Upload className="w-4 h-4 mr-2" />
                    Try New Image
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
