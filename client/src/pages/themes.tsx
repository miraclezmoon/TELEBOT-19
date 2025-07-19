import { ThemeSelector } from "@/components/theme-selector";

export default function Themes() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Themes & Appearance</h1>
        <p className="text-muted-foreground mt-2">
          Customize the look and feel of your admin panel
        </p>
      </div>

      <ThemeSelector />
    </div>
  );
}