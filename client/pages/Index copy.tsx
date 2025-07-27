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
  const segmentPeople = useCallback(async (imageElement: HTMLImageElement) => {
    setIsProcessing(true);

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Generate mock person segmentations with realistic human-like shapes
    const mockPeople: SegmentedPerson[] = [];
    const personCount = Math.floor(Math.random() * 4) + 2; // 2-5 people

    for (let i = 0; i < personCount; i++) {
      // Generate a human-like silhouette polygon
      const centerX = Math.random() * (imageElement.width - 200) + 100;
      const centerY = Math.random() * (imageElement.height - 300) + 150;
      const scale = 0.7 + Math.random() * 0.6; // Vary person sizes

      // Create a simplified human silhouette shape
      const humanShape = [
        // Head (top)
        [centerX, centerY - 80 * scale],
        [centerX + 25 * scale, centerY - 75 * scale],
        [centerX + 30 * scale, centerY - 60 * scale],
        [centerX + 25 * scale, centerY - 45 * scale],
        // Right shoulder and arm
        [centerX + 40 * scale, centerY - 30 * scale],
        [centerX + 55 * scale, centerY - 20 * scale],
        [centerX + 50 * scale, centerY + 20 * scale],
        [centerX + 45 * scale, centerY + 60 * scale],
        [centerX + 35 * scale, centerY + 80 * scale],
        // Right side of torso and leg
        [centerX + 30 * scale, centerY + 120 * scale],
        [centerX + 35 * scale, centerY + 160 * scale],
        [centerX + 20 * scale, centerY + 180 * scale],
        [centerX + 15 * scale, centerY + 200 * scale],
        // Between legs
        [centerX, centerY + 190 * scale],
        // Left leg
        [centerX - 15 * scale, centerY + 200 * scale],
        [centerX - 20 * scale, centerY + 180 * scale],
        [centerX - 35 * scale, centerY + 160 * scale],
        [centerX - 30 * scale, centerY + 120 * scale],
        // Left side of torso and arm
        [centerX - 35 * scale, centerY + 80 * scale],
        [centerX - 45 * scale, centerY + 60 * scale],
        [centerX - 50 * scale, centerY + 20 * scale],
        [centerX - 55 * scale, centerY - 20 * scale],
        [centerX - 40 * scale, centerY - 30 * scale],
        // Left shoulder
        [centerX - 25 * scale, centerY - 45 * scale],
        [centerX - 30 * scale, centerY - 60 * scale],
        [centerX - 25 * scale, centerY - 75 * scale],
      ] as Array<[number, number]>;

      // Calculate bounding box
      const xs = humanShape.map(p => p[0]);
      const ys = humanShape.map(p => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      mockPeople.push({
        id: `person-${i}`,
        polygon: humanShape,
        bbox: {
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        },
        confidence: 0.75 + Math.random() * 0.24,
        area: (maxX - minX) * (maxY - minY)
      });
    }

    setPeople(mockPeople);
    setIsProcessing(false);
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImage(result);
        setPeople([]);
        setShuffleState({ isShuffling: false, selectedId: null, highlightedId: null });
        
        // Process image after it loads
        setTimeout(() => {
          if (imageRef.current) {
            segmentPeople(imageRef.current);
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
            Upload an image to segment people and randomly select individuals with our smart shuffling algorithm
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
                  {people.length} people segmented
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
                        segmentPeople(imageRef.current);
                      }
                    }
                  }}
                />
                
                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                    <div className="text-center">
                      <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3"></div>
                      <p className="text-sm text-muted-foreground">Segmenting people...</p>
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
                  const displayedWidth = imgElement.offsetWidth;
                  const displayedHeight = imgElement.offsetHeight;
                  const naturalWidth = imgElement.naturalWidth;
                  const naturalHeight = imgElement.naturalHeight;

                  // Calculate scale factors for the displayed image vs natural size
                  const scaleX = displayedWidth / naturalWidth;
                  const scaleY = displayedHeight / naturalHeight;

                  // Convert polygon coordinates to SVG coordinates
                  const polygonPoints = person.polygon
                    .map(([x, y]) => `${x * scaleX},${y * scaleY}`)
                    .join(' ');

                  return (
                    <div key={person.id} className="absolute inset-0">
                      <svg
                        className="absolute inset-0 w-full h-full pointer-events-none"
                        style={{ zIndex: 10 }}
                        viewBox={`0 0 ${displayedWidth} ${displayedHeight}`}
                        width={displayedWidth}
                        height={displayedHeight}
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
                            filter: isSelected ? 'drop-shadow(0 0 8px rgba(0, 185, 185, 0.5))' :
                                   isHighlighted ? 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.5))' : 'none'
                          }}
                        />
                      </svg>

                      {isSelected && (
                        <div
                          className="absolute transform -translate-x-1/2 -translate-y-full"
                          style={{
                            left: `${((person.bbox.x + person.bbox.width/2) * scaleX / displayedWidth) * 100}%`,
                            top: `${(person.bbox.y * scaleY / displayedHeight) * 100}%`,
                            zIndex: 20
                          }}
                        >
                          <Badge className="bg-accent text-accent-foreground text-xs whitespace-nowrap">
                            <Sparkles className="w-3 h-3 mr-1" />
                            Selected Person!
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
                  The algorithm has selected a person from your image. Want to try again?
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
