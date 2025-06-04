import { ReactNode, useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";
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
    <div className="flex min-h-screen">
      {/* Mobile menu toggle button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        <Menu />
        <span className="sr-only">Toggle menu</span>
      </Button>

      {/* Responsive Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        "md:block"
      )}>
        <Sidebar />
      </div>

      {/* Dark overlay when mobile menu is open */}
      {isMobileMenuOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main content area */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto pt-16 md:pt-6">
        <Outlet/>
      </main>
    </div>
  );
}
