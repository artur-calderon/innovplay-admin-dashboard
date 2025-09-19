import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  animation?: 'none' | 'fade' | 'slide' | 'scale' | 'bounce';
  delay?: number;
}

export default function AnimatedCard({ 
  children, 
  className,
  hover = true,
  animation = 'scale',
  delay = 0
}: AnimatedCardProps) {
  
  const getAnimationClasses = () => {
    const baseClasses = "transition-all duration-300 ease-in-out";
    
    if (!hover) return baseClasses;
    
    switch (animation) {
      case 'fade':
        return `${baseClasses} hover:opacity-90`;
      case 'slide':
        return `${baseClasses} hover:translate-x-1`;
      case 'scale':
        return `${baseClasses} hover:scale-105 hover:shadow-lg`;
      case 'bounce':
        return `${baseClasses} hover:animate-bounce`;
      case 'none':
      default:
        return baseClasses;
    }
  };

  const animationStyle = delay > 0 ? {
    animationDelay: `${delay}ms`
  } : {};

  return (
    <div 
      className={cn(
        getAnimationClasses(),
        className
      )}
      style={animationStyle}
    >
      {children}
    </div>
  );
}

