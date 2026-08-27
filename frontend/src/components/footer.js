import React from "react";
import {
  FaFacebook,
  FaTwitter,
  FaLinkedinIn,
} from "react-icons/fa";

const socialLinks = [
  { icon: FaFacebook, href: "https://facebook.com", label: "Facebook" },
  { icon: FaTwitter, href: "https://twitter.com", label: "Twitter" },
  { icon: FaLinkedinIn, href: "https://linkedin.com", label: "LinkedIn" },
];

function Footer() {
  return (
    <footer className="footer-shell">
      <span className="footer-copy">
        &copy; {new Date().getFullYear()} Ceylon Railway AI Operations System
      </span>

      <span className="footer-note">AI-driven railway decision support</span>

      <div className="footer-socials">
        {socialLinks.map(({ icon: Icon, href, label }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="footer-icon-link"
          >
            <Icon />
          </a>
        ))}
      </div>
    </footer>
  );
}

export default Footer;