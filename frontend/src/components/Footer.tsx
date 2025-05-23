'use client';

import { FC } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FaGithub, FaTwitter, FaLinkedin } from 'react-icons/fa';

interface FooterLink {
  name: string;
  href: string;
}

interface SocialLink {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface FooterLinksProps {
  heading: string;
  items: FooterLink[];
}

const FooterLinks: FC<FooterLinksProps> = ({ heading, items }) => (
  <div className="flex-1 flex flex-col items-start">
    <h3 className="font-inter text-foreground font-semibold text-lg mb-6">
      {heading}
    </h3>
    {items.map((item, index) => (
      <Link
        key={index}
        href={item.href}
        className="font-inter text-foreground text-base hover:text-muted-foreground transition-colors my-2"
      >
        {item.name}
      </Link>
    ))}
  </div>
);

const Footer: FC = () => {
  const socialLinks: SocialLink[] = [
    {
      name: 'GitHub',
      href: 'https://github.com/t9fiction',
      icon: FaGithub,
    },
    {
      name: 'Twitter',
      href: 'https://x.com/t9fiction',
      icon: FaTwitter,
    },
    {
      name: 'LinkedIn',
      href: 'https://www.linkedin.com/in/sohail-ishaque/',
      icon: FaLinkedin,
    },
  ];

  return (
    <footer className="bg-background border-t border-border p-4 sm:p-6">
      <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        {/* Logo */}
        <Link
          href="https://layerzero.network/"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="LayerZero Network"
        >
          <Image
            src="/logo.png" // Replace with actual logo path
            width={40}
            height={40}
            alt="LayerZero Logo"
            className="object-contain"
          />
        </Link>

        {/* Footer Links */}
        <div className="flex flex-col sm:flex-row gap-8">
          <FooterLinks
            heading="Company"
            items={[
              { name: 'Terms of Service', href: '/terms' },
              { name: 'Support', href: '/support' },
            ]}
          />
          <FooterLinks
            heading="Resources"
            items={[
              { name: 'Blog', href: '/blog' },
              { name: 'Documentation', href: '/docs' },
            ]}
          />
        </div>

        {/* Social Media */}
        <div className="flex flex-row gap-4">
          {socialLinks.map((social) => {
            const Icon = social.icon;
            return (
              <Link
                key={social.href}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visit our ${social.name} page`}
              >
                <Icon className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors" />
              </Link>
            );
          })}
        </div>
      </div>
    </footer>
  );
};

export default Footer;