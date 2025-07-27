import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Shuffle, Camera, Sparkles, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

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

      // ⬇️ Limit size to 768px max on either dimension
      const maxDim = 768;
      if (width > maxDim || height > maxDim) {
        const scale = Math.min(maxDim / width, maxDim / height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("width", String(width));
      formData.append("height", String(height));

      const response = await fetch("https://lucky-photo-picker-319016205501.asia-southeast2.run.app/detect/", {
        method: "POST",
        body: formData
      });

      const data = await response.json();

      // Set the resized base64 image returned from server
      setImage(`data:image/jpeg;base64,${data.original_image}`);

      const maskToPolygon = (mask: number[][]): Array<[number, number]> => {
        const h = mask.length;
        const w = mask[0].length;
        const visited = Array.from({ length: h }, () => Array(w).fill(false));
        const points: Array<[number, number]> = [];

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (mask[y][x] === 1 && !visited[y][x]) {
              visited[y][x] = true;
              // Simplified corner detection for visual polygon
              points.push([x, y]);
            }
          }
        }

        return points.length > 3 ? points : [];
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
    const maxShuffles = 20;

    const shuffleInterval = setInterval(() => {
      const randomPerson = people[Math.floor(Math.random() * people.length)];
      setShuffleState(prev => ({ ...prev, highlightedId: randomPerson.id }));

      shuffleCount++;
      if (shuffleCount >= maxShuffles) {
        clearInterval(shuffleInterval);
        const finalPerson = people[Math.floor(Math.random() * people.length)];
        setShuffleState({
          isShuffling: false,
          selectedId: finalPerson.id,
          highlightedId: null,
        });
      }
    }, 100);
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
              <div className="flex flex-col items-center gap-3 md:gap-4">
                <div className="p-3 md:p-4 bg-primary/10 rounded-full">
                  <Upload className="w-8 h-8 md:w-12 md:h-12 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-2">Drop your image here</h3>
                  <p className="text-muted-foreground mb-4 text-sm md:text-base">
                    or click to browse from your device
                  </p>
                  <Button onClick={openNewImage} size="lg" className="gap-2">
                    <Upload className="w-4 h-4 md:w-5 md:h-5" />
                    Choose Image
                  </Button>
                </div>
              </div>
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
                <Button variant="secondary" onClick={openNewImage} size="sm" className="md:h-10">
                  <Upload className="w-4 h-4 mr-1 md:mr-2" />
                  <span className="hidden sm:inline">New Image</span>
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
                            isSelected && "fill-accent/30 stroke-accent stroke-2",
                            isHighlighted && "fill-primary/30 stroke-primary stroke-2 animate-pulse",
                            !isSelected && !isHighlighted && "fill-primary/20 stroke-primary/80 stroke-1"
                          )}
                          style={{
                            opacity: isSelected ? 0.5 : isHighlighted ? 0.8 : 0.5,
                            filter: isSelected ? 'drop-shadow(0 0 8px rgba(0, 185, 185, 0.5))' :
                                   isHighlighted ? 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))' : 'none'
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
