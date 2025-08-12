import { Upload, Brain, Shuffle, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const HowItWorks = () => {
  const steps = [
    {
      step: 1,
      icon: Upload,
      title: "Upload Your Photo",
      description:
        "Drag and drop an image or use your camera to capture a new photo. We support all common image formats.",
    },
    {
      step: 2,
      icon: Brain,
      title: "AI Processing",
      description:
        "Our advanced AI algorithms analyze your image and segment all detectable objects with precise boundaries.",
    },
    {
      step: 3,
      icon: Shuffle,
      title: "Smart Selection",
      description:
        "Click shuffle to randomly select one of the detected objects with our engaging animation system.",
    },
    {
      step: 4,
      icon: Sparkles,
      title: "Get Results",
      description:
        "See your selected object highlighted with visual effects. Shuffle again or try a new image anytime.",
    },
  ];

  return (
    <section id="how-it-works" className="py-16 bg-card">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get started with PhotoPicker in just four simple steps. Our
            AI-powered process makes object selection effortless.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              <Card className="h-full hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="relative mb-6">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-accent text-accent-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {step.step}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-primary/50 to-accent/50 transform -translate-y-1/2 z-10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
