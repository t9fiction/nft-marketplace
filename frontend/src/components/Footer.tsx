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
  <div className="flex flex-col items-start">
    <h3 className="font-inter font-semibold text-lg text-foreground mb-4">
      {heading}
    </h3>
    <div className="flex flex-col space-y-3">
      {items.map((item, index) => (
        <Link
          key={index}
          href={item.href}
          className="font-inter text-foreground/70 hover:text-primary transition-all duration-200 text-sm hover:translate-x-1 transform"
        >
          {item.name}
        </Link>
      ))}
    </div>
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
    <footer className="bg-main/5 bg-background backdrop-blur-sm border-t border-primary/20 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Section */}
          <div className="col-span-1 md:col-span-2 lg:col-span-1 space-y-4">
            <Link
              href="https://layerzero.network/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LayerZero Network"
              className="inline-block group"
            >
              <div className="flex items-center space-x-3 group-hover:scale-105 transition-transform duration-200">
                <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center shadow-lg">
                  <Image
                    src="/logo.png" // Replace with actual logo path
                    width={24}
                    height={24}
                    alt="LayerZero Logo"
                    className="object-contain"
                  />
                </div>
                <span className="font-poppins font-bold text-xl text-foreground">
                  NFT Market
                </span>
              </div>
            </Link>
            <p className="text-foreground/60 font-inter text-sm max-w-xs leading-relaxed">
              Create, discover, and trade unique digital assets on the most advanced NFT marketplace.
            </p>
          </div>

          {/* Company Links */}
          <div className="space-y-1">
            <FooterLinks
              heading="Company"
              items={[
                { name: 'About Us', href: '/about' },
                { name: 'Terms of Service', href: '/terms' },
                { name: 'Privacy Policy', href: '/privacy' },
                { name: 'Support', href: '/support' },
              ]}
            />
          </div>

          {/* Resources Links */}
          <div className="space-y-1">
            <FooterLinks
              heading="Resources"
              items={[
                { name: 'Documentation', href: '/docs' },
                { name: 'Blog', href: '/blog' },
                { name: 'Community', href: '/community' },
                { name: 'Help Center', href: '/help' },
              ]}
            />
          </div>

          {/* Social Media & Newsletter */}
          <div className="space-y-6">
            <div>
              <h3 className="font-inter font-semibold text-lg text-foreground mb-4">
                Connect
              </h3>
              <div className="flex space-x-4">
                {socialLinks.map((social) => {
                  const Icon = social.icon;
                  return (
                    <Link
                      key={social.href}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Visit our ${social.name} page`}
                      className="group"
                    >
                      <div className="w-10 h-10 bg-background/50 hover:bg-primary/20 border border-primary/20 hover:border-primary/40 rounded-lg flex items-center justify-center transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg">
                        <Icon className="h-5 w-5 text-foreground/70 group-hover:text-primary transition-colors duration-200" />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Newsletter Signup */}
            <div className="space-y-3">
              <h4 className="font-inter font-medium text-foreground">Stay Updated</h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 min-w-0 px-2 py-2 bg-background/50 border border-primary/20 rounded-lg text-sm text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition-all duration-200 font-inter"
                />
                <button className="px-2 py-2 bg-gradient-to-r from-primary to-secondary text-white rounded-lg text-sm font-semibold hover:shadow-lg transform hover:scale-105 active:scale-95 transition-all duration-200 font-inter whitespace-nowrap">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-12 pt-8 border-t border-primary/10">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="text-foreground/60 text-sm font-inter text-center sm:text-left">
              © {new Date().getFullYear()} NFT Marketplace. All rights reserved.
            </div>
            
            <div className="flex flex-wrap justify-center sm:justify-end gap-6 text-sm">
              <Link 
                href="/terms" 
                className="text-foreground/60 hover:text-primary transition-colors duration-200 font-inter"
              >
                Terms
              </Link>
              <Link 
                href="/privacy" 
                className="text-foreground/60 hover:text-primary transition-colors duration-200 font-inter"
              >
                Privacy
              </Link>
              <Link 
                href="/cookies" 
                className="text-foreground/60 hover:text-primary transition-colors duration-200 font-inter"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
    </footer>
  );
};

export default Footer;