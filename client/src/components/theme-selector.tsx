import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/components/theme-provider";
import { themes } from "@/lib/themes";
import { Check, Palette, Sun, Moon, Monitor } from "lucide-react";

export function ThemeSelector() {
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="space-y-6">
      {/* Dark/Light Mode Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Appearance Mode
          </CardTitle>
          <CardDescription>
            Choose between light and dark mode, or follow your system preference
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {themeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = theme === option.value;
              
              return (
                <Button
                  key={option.value}
                  variant={isSelected ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTheme(option.value as any)}
                  className="flex items-center gap-2"
                >
                  <Icon className="h-4 w-4" />
                  {option.label}
                  {isSelected && <Check className="h-4 w-4" />}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Color Theme Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Color Theme
          </CardTitle>
          <CardDescription>
            Select a color theme to personalize your admin panel
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {themes.map((themeOption) => {
              const isSelected = colorTheme === themeOption.name;
              
              return (
                <div
                  key={themeOption.name}
                  className={`relative p-4 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                    isSelected 
                      ? 'border-primary bg-primary/5 shadow-md' 
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setColorTheme(themeOption.name)}
                >
                  {/* Theme Preview */}
                  <div className="mb-3">
                    <div className="flex h-8 rounded-md overflow-hidden">
                      <div 
                        className="flex-1" 
                        style={{ backgroundColor: themeOption.colors.primary }}
                      />
                      <div 
                        className="flex-1" 
                        style={{ backgroundColor: themeOption.colors.secondary }}
                      />
                      <div 
                        className="flex-1" 
                        style={{ backgroundColor: themeOption.colors.accent }}
                      />
                      <div 
                        className="flex-1" 
                        style={{ backgroundColor: themeOption.colors.muted }}
                      />
                    </div>
                  </div>
                  
                  {/* Theme Info */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{themeOption.label}</h4>
                      <p className="text-xs text-muted-foreground capitalize">{themeOption.name}</p>
                    </div>
                    
                    {isSelected && (
                      <div className="flex items-center gap-1">
                        <Check className="h-4 w-4 text-primary" />
                        <Badge variant="secondary" className="text-xs">Active</Badge>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Theme Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Current Theme Preview</CardTitle>
          <CardDescription>
            Preview of how your selected theme looks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample UI Elements */}
            <div className="flex items-center gap-4">
              <Button size="sm">Primary Button</Button>
              <Button variant="secondary" size="sm">Secondary Button</Button>
              <Button variant="outline" size="sm">Outline Button</Button>
            </div>
            
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Card Example</h4>
              <p className="text-sm text-muted-foreground">
                This is how cards and muted backgrounds will appear with your selected theme.
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge>Default Badge</Badge>
              <Badge variant="secondary">Secondary Badge</Badge>
              <Badge variant="outline">Outline Badge</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}