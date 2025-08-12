import { Camera, Zap, Brain, Shuffle, Upload, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const Features = () => {
  const features = [
    {
      icon: Brain,
      title: "AI-Powered Detection",
      description: "Advanced machine learning algorithms automatically detect and segment objects in your photos with incredible precision."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Process images in seconds with our optimized segmentation pipeline. No waiting, just instant results."
    },
    {
      icon: Shuffle,
      title: "Smart Shuffling",
      description: "Our intelligent shuffling algorithm randomly selects objects with smooth animations and audio feedback."
    },
    {
      icon: Camera,
      title: "Multiple Input Methods",
      description: "Upload images from your device or capture them directly using your camera for maximum convenience."
    },
    {
      icon: Upload,
      title: "Drag & Drop Interface",
      description: "Intuitive file handling with support for drag and drop functionality across all modern browsers."
    },
    {
      icon: Sparkles,
      title: "Visual Feedback",
      description: "Rich visual overlays with polygon highlighting, selection indicators, and smooth transitions."
    }
  ];

  return (
    <section id="features" className="py-16 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Powerful Features
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Discover the advanced capabilities that make PhotoPicker the ultimate tool for intelligent photo object selection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50">
              <CardContent className="p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 bg-primary/10 rounded-full">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
