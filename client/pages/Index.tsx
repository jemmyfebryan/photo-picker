import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Shuffle, Camera, Sparkles, RefreshCw, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { Features } from "../components/Features";
import { HowItWorks } from "../components/HowItWorks";
import { About } from "../components/About";

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
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-background via-secondary/20 to-background overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="container mx-auto px-4 relative">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Object Detection
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent leading-tight">
              Smart Photo
              <br />
              Object Selection
            </h1>
            <p className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto mb-8 leading-relaxed">
              Transform your photo workflow with advanced AI. Upload any image and let our intelligent algorithms detect, segment, and randomly select objects with stunning visual precision.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="#photo-picker" className="inline-flex">
                <Button size="lg" className="gap-2 text-lg px-8 py-6">
                  <Camera className="w-5 h-5" />
                  Try PhotoPicker
                </Button>
              </a>
              <a href="#how-it-works" className="inline-flex">
                <Button variant="outline" size="lg" className="gap-2 text-lg px-8 py-6">
                  <ArrowDown className="w-5 h-5" />
                  Learn More
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      <Features />
      <HowItWorks />

      {/* Main PhotoPicker Application */}
      <section id="photo-picker" className="py-20 bg-gradient-to-b from-background to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Try PhotoPicker Now
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Experience the power of AI-driven object selection. Upload your image and watch our technology work its magic.
            </p>
          </div>

          {!image ? (
            /* Upload Area */
            <Card className="max-w-3xl mx-auto shadow-2xl">
              <div
                className={cn(
                  "border-2 border-dashed border-border rounded-xl p-8 md:p-16 text-center transition-all duration-300",
                  isDragging && "border-primary bg-primary/5 scale-105 shadow-lg"
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
                <div className="flex flex-col items-center gap-4 md:gap-6">
                  <div className="p-4 md:p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full">
                    <Upload className="w-12 h-12 md:w-16 md:h-16 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold mb-3 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      Drop your image here
                    </h3>
                    <p className="text-muted-foreground mb-6 text-base md:text-lg max-w-md mx-auto">
                      Upload any image to begin AI-powered object detection and selection
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button onClick={openNewImage} size="lg" className="gap-2 text-lg px-8">
                        <Upload className="w-5 h-5" />
                        Choose Image
                      </Button>
                      <Button
                        onClick={startCameraHandler}
                        variant="secondary"
                        size="lg"
                        className="gap-2 text-lg px-8"
                      >
                        <Camera className="w-5 h-5" />
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
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Controls */}
              <Card className="p-6 bg-gradient-to-r from-card to-secondary/20">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  <div className="flex items-center gap-3 flex-wrap">
                    <Badge variant="secondary" className="text-sm px-3 py-1">
                      {people.length} objects detected
                    </Badge>
                    {shuffleState.selectedId && (
                      <Badge className="bg-accent text-accent-foreground text-sm px-3 py-1">
                        <Sparkles className="w-4 h-4 mr-1" />
                        Object Selected!
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-3 flex-wrap">
                    <Button
                      variant="outline"
                      onClick={resetSelection}
                      disabled={isProcessing || shuffleState.isShuffling}
                      className="gap-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      Reset
                    </Button>
                    <Button
                      onClick={shufflePeople}
                      disabled={people.length === 0 || isProcessing || shuffleState.isShuffling}
                      className="gap-2"
                    >
                      <Shuffle className={cn("w-4 h-4", shuffleState.isShuffling && "animate-spin")} />
                      {shuffleState.isShuffling ? "Shuffling..." : "Shuffle Objects"}
                    </Button>
                    <Button variant="secondary" onClick={openNewImage} className="gap-2">
                      <Upload className="w-4 h-4" />
                      New Image
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setImage(null);
                        setPeople([]);
                        setShuffleState({ isShuffling: false, selectedId: null, highlightedId: null });
                        startCameraHandler();
                      }}
                      className="gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Camera
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Image Display */}
              <Card className="overflow-hidden shadow-2xl">
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
                <Card className="p-8 text-center bg-gradient-to-r from-accent/10 via-primary/5 to-accent/10 border-accent/20 shadow-xl">
                  <div className="flex items-center justify-center gap-3 mb-6">
                    <Sparkles className="w-8 h-8 text-accent animate-pulse" />
                    <h3 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                      Object Selected!
                    </h3>
                    <Sparkles className="w-8 h-8 text-accent animate-pulse" />
                  </div>
                  <p className="text-muted-foreground mb-8 text-lg max-w-2xl mx-auto">
                    Our AI has successfully identified and selected an object from your image.
                    Ready for another round or want to try a different image?
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button onClick={shufflePeople} size="lg" className="gap-2 text-lg px-8">
                      <Shuffle className="w-5 h-5" />
                      Shuffle Again
                    </Button>
                    <Button variant="secondary" onClick={openNewImage} size="lg" className="gap-2 text-lg px-8">
                      <Upload className="w-5 h-5" />
                      Try New Image
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </section>

      <About />
      <Footer />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
