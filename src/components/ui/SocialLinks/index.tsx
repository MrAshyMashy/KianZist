"use client";

import { Instagram, Linkedin, Twitter, Send } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

const socialIcons = {
  instagram: Instagram,
  linkedin: Linkedin,
  twitter: Twitter,
  telegram: Send,
};

interface SocialLink {
  platform: keyof typeof socialIcons;
  url: string;
}

interface SocialLinksProps {
  links: SocialLink[];
  className?: string;
}

export const SocialLinks = ({ links, className }: SocialLinksProps) => {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {links.map((link, i) => {
        const Icon = socialIcons[link.platform] || Send;
        return (
          <a key={i} href={link.url} target="_blank" rel="noreferrer">
            <IconButton className="h-10 w-10 rounded-full border border-kz-border-subtle/50 bg-kz-bg-surface/30 backdrop-blur-md hover:border-kz-brand-accent/40 hover:bg-kz-brand-accent/10 hover:text-kz-brand-accent">
              <Icon size={18} />
            </IconButton>
          </a>
        );
      })}
    </div>
  );
};
