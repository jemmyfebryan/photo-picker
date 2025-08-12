import { Target, Users, Award, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const About = () => {
  const stats = [
    {
      icon: Target,
      value: "99.5%",
      label: "Accuracy Rate",
      description: "Precision in object detection"
    },
    {
      icon: Users,
      value: "50K+",
      label: "Active Users",
      description: "Worldwide community"
    },
    {
      icon: Award,
      value: "AI Excellence",
      label: "Award Winner",
      description: "Industry recognition"
    },
    {
      icon: TrendingUp,
      value: "1M+",
      label: "Images Processed",
      description: "Successfully analyzed"
    }
  ];

  return (
    <section id="about" className="py-16 bg-gradient-to-b from-secondary/20 to-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              About PhotoPicker
            </h2>
            <p className="text-muted-foreground text-lg">
              Leading the future of intelligent image processing with cutting-edge AI technology.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h3 className="text-2xl font-semibold mb-6">Our Mission</h3>
              <p className="text-muted-foreground leading-relaxed mb-6">
                PhotoPicker was born from the vision to make advanced AI technology accessible to everyone. 
                We believe that powerful machine learning capabilities shouldn't be limited to large 
                corporations or require extensive technical knowledge.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Our team of AI researchers and developers has created a seamless experience that brings 
                state-of-the-art object detection and segmentation directly to your browser. No downloads, 
                no installations, just pure AI power at your fingertips.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Whether you're a photographer, designer, researcher, or just curious about AI capabilities, 
                PhotoPicker provides an intuitive way to explore the possibilities of computer vision technology.
              </p>
            </div>
            <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl p-8 text-center">
              <div className="text-4xl mb-4">🎯</div>
              <h4 className="text-xl font-semibold mb-3">Innovation at Heart</h4>
              <p className="text-muted-foreground">
                Continuously pushing the boundaries of what's possible with AI-powered image analysis.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div className="text-2xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="font-semibold mb-2">{stat.label}</div>
                  <div className="text-sm text-muted-foreground">{stat.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
