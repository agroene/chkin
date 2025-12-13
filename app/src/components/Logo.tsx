import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  linkToHome?: boolean;
  className?: string;
}

export default function Logo({ size = "md", linkToHome = false, className = "" }: LogoProps) {
  const sizes = {
    sm: { width: 120, height: 40 },
    md: { width: 180, height: 60 },
    lg: { width: 350, height: 120 },
  };

  const { width, height } = sizes[size];

  const logoImage = (
    <Image
      src="/logo.png"
      alt="Chkin - Share your info. Own your consent."
      width={width}
      height={height}
      className={className}
      priority
    />
  );

  if (linkToHome) {
    return (
      <Link href="/" className="inline-block">
        {logoImage}
      </Link>
    );
  }

  return logoImage;
}
