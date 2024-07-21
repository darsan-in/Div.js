type screenCats = "1X" | "2X" | "3X" | "4X" | "5X" | "6X" | "7X";

export interface ConfigurationOptions {
  screenSizes: Partial<Record<screenCats, number>>;
}
