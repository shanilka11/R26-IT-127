import React from "react";
import {
  FaPhoneAlt,
  FaEnvelope,
  FaFacebook,
  FaTwitter,
  FaLinkedinIn,
} from "react-icons/fa";

// Keep in sync with nav.js theme tokens
const theme = {
  bg: "#0B1120",
  border: "rgba(255,255,255,0.08)",
  textPrimary: "#F1F5F9",
  textSecondary: "#94A3B8",
  accentBlue: "#3B82F6",
};

const socialLinks = [
  { icon: FaFacebook, href: "https://facebook.com", label: "Facebook" },
  { icon: FaTwitter, href: "https://twitter.com", label: "Twitter" },
  { icon: FaLinkedinIn, href: "https://linkedin.com", label: "LinkedIn" },
];

const iconLinkStyle = {
  color: theme.textSecondary,
  fontSize: 16,
  display: "inline-flex",
};

function Footer() {
  return (
    <footer
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        padding: "16px 24px",
        backgroundColor: theme.bg,
        borderTop: `1px solid ${theme.border}`,
      }}
    >
      <span style={{ color: theme.textSecondary, fontSize: 13 }}>
        &copy; {new Date().getFullYear()} PMS. All Rights Reserved.
      </span>

      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <a
          href="tel:+94000000000"
          style={{ ...iconLinkStyle, alignItems: "center", gap: 6 }}
        >
          <FaPhoneAlt />
          <span style={{ fontSize: 13 }}>+94 00 000 0000</span>
        </a>
        <a
          href="mailto:info@example.com"
          style={{ ...iconLinkStyle, alignItems: "center", gap: 6 }}
        >
          <FaEnvelope />
          <span style={{ fontSize: 13 }}>info@example.com</span>
        </a>
      </div>

      <div style={{ display: "flex", gap: 14 }}>
        {socialLinks.map(({ icon: Icon, href, label }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            style={iconLinkStyle}
            onMouseEnter={(e) => (e.currentTarget.style.color = theme.accentBlue)}
            onMouseLeave={(e) => (e.currentTarget.style.color = theme.textSecondary)}
          >
            <Icon />
          </a>
        ))}
      </div>
    </footer>
  );
}

export default Footer;