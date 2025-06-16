import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";

// Define interface for a footer link object
interface FooterLink {
  label: string;
  url: string;
}

// Default static footer links configuration
const defaultFooterLinks: FooterLink[] = [
  { label: "Privacy Policy", url: "/privacy" },
  { label: "Terms of Service", url: "/terms" },
  { label: "Support", url: "/support" }
];

// Async function to load footer links. This function may be
// replaced by a real API call to your backend if available.
const fetchFooterLinks = async (): Promise<FooterLink[]> => {
  // Example of a backend call (commented out because no endpoint is defined):
  // const { data } = await axios.get(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'}/api/footer-links`);
  // return data;
  return defaultFooterLinks;
};

const GV_Footer: React.FC = () => {
  // Use react-query to load footer links
  const { data: footerLinksData, isLoading, isError } = useQuery<FooterLink[]>(
    ["footerLinks"],
    fetchFooterLinks
  );

  // Compute the current year dynamically for copyright display
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  return (
    <>
      <footer className="bg-gray-800 text-gray-200 py-4">
        <div className="container mx-auto px-4 flex flex-col sm:flex-row justify-between items-center">
          <div className="text-sm mb-2 sm:mb-0">
            © {currentYear} TaskFlow. All rights reserved.
          </div>
          <div className="flex space-x-4">
            {isLoading ? (
              <div className="text-sm">Loading links...</div>
            ) : isError ? (
              <>
                <Link to="/privacy" className="text-sm hover:underline">
                  Privacy Policy
                </Link>
                <Link to="/terms" className="text-sm hover:underline">
                  Terms of Service
                </Link>
                <Link to="/support" className="text-sm hover:underline">
                  Support
                </Link>
              </>
            ) : (
              footerLinksData?.map((link) => (
                <Link key={link.label} to={link.url} className="text-sm hover:underline">
                  {link.label}
                </Link>
              ))
            )}
          </div>
        </div>
      </footer>
    </>
  );
};

export default GV_Footer;