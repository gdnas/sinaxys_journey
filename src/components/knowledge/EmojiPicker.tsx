import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  children?: React.ReactNode;
}

const EMOJI_CATEGORIES = {
  "Documentos": ["📄", "📝", "📚", "📖", "📋", "📌", "🎯", "💡", "🔧", "📊", "🗂️", "📁"],
  "Pessoas": ["👥", "👤", "🧑", "👨", "👩", "🧒", "👶", "🦸", "🧙", "🧛"],
  "Negócios": ["💼", "🏢", "💰", "📈", "📉", "💳", "🏦", "💴", "💵", "💶"],
  "Ferramentas": ["🔨", "🔧", "⚙️", "🛠️", "🔩", "⚡", "🔋", "💡", "🔬", "🔭"],
  "Marcadores": ["🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟤", "🔶"],
  "Outros": ["⭐", "🚀", "✨", "🎉", "🎊", "🏆", "🥇", "🎯", "💎", "🔥"],
};

export function EmojiPicker({ value, onChange, children }: EmojiPickerProps) {
  const [search, setSearch] = useState("");

  const filteredCategories = Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => ({
    category,
    emojis: emojis.filter((emoji) =>
      emoji.includes(search) || category.toLowerCase().includes(search.toLowerCase())
    ),
  }));

  return (
    <Popover>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="text-2xl">
            {value}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          {/* Search */}
          <input
            type="text"
            placeholder="Buscar emoji..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />

          {/* Emoji Grid */}
          <ScrollArea className="h-64">
            <div className="space-y-3">
              {filteredCategories.map(
                ({ category, emojis }) =>
                  emojis.length > 0 && (
                    <div key={category}>
                      <h4 className="text-xs font-medium text-muted-foreground mb-2">
                        {category}
                      </h4>
                      <div className="grid grid-cols-8 gap-1">
                        {emojis.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => onChange(emoji)}
                            className={cn(
                              "flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition",
                              value === emoji && "bg-muted"
                            )}
                            title={emoji}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
              )}
            </div>
          </ScrollArea>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Quick emoji selector for simple use cases
export function QuickEmojiSelector({
  value,
  onChange,
  options = EMOJI_CATEGORIES["Documentos"],
}: {
  value: string;
  onChange: (emoji: string) => void;
  options?: string[];
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">Ícone:</span>
      <div className="flex gap-1">
        {options.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onChange(emoji)}
            className={cn(
              "flex items-center justify-center w-8 h-8 rounded-md hover:bg-muted transition",
              value === emoji && "bg-muted"
            )}
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
