import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Outlet } from "react-router-dom";
import { cn } from "@/lib/utils";

type LayoutProps = {
  children: ReactNode;
};

export default function Layout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    // Initial check
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMobile);

    // Clean up
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  // Prevent scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    // Clean up on component unmount
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileMenuOpen]);

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile Header with Menu Button */}
      <header className={cn(
        "md:hidden fixed top-0 left-0 right-0 z-[60]",
        "bg-white/95 backdrop-blur-md border-b border-gray-200/80",
        "px-4 py-3 flex items-center justify-between shadow-sm"
      )}>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-9 w-9 rounded-lg transition-all duration-200",
            "hover:bg-gray-100 active:scale-95",
            isMobileMenuOpen 
              ? "bg-gray-100 text-gray-900" 
              : "text-gray-600 hover:text-gray-900"
          )}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
          <span className="sr-only">
            {isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          </span>
        </Button>
        
        <div className="flex items-center">
          <img 
            src="/LOGO-1-menor.png" 
            alt="Logo" 
            className="h-8 object-contain"
          />
        </div>
        
        <div className="w-9"></div> {/* Spacer for centering */}
      </header>

      {/* Responsive Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
        "md:relative md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        "md:block"
      )}>
        <Sidebar onMobileMenuClose={() => setIsMobileMenuOpen(false)} />
      </aside>

      {/* Dark overlay when mobile menu is open */}
      {isMobileMenuOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content area */}
      <main className={cn(
        "flex-1 overflow-y-auto relative",
        "pt-16 md:pt-0", // Top padding for mobile header
        "bg-gray-50 min-h-screen"
      )}>
        {/* Content Container */}
        <div className="px-4 py-4 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
