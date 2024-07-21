#!/usr/bin/env node

import { Command } from "commander";
import { divJs } from "../div";

const program = new Command("div");

program
  .version("0.0.1")
  .description("Div.js")
  .requiredOption(
    "-p, --patterns <patterns>",
    "HTML search patterns, comma-separated"
  )
  .requiredOption("-d, --destination <path>", "Destination base path")
  .option("-b, --base <path>", "Base search path", process.cwd())
  .option("-i, --ignore <patterns>", "Ignore patterns, comma-separated", "")
  .action((options) => {
    const htmlSearchPatterns: string[] = options.patterns.split(",");
    const destinationBasePath: string = options.destination;
    const baseSearchPath: string = options.base;
    const ignorePatterns: string[] = options.ignore
      ? options.ignore.split(",")
      : [];

    divJs(
      htmlSearchPatterns,
      destinationBasePath,
      baseSearchPath,
      ignorePatterns
    ).catch(console.error);
  });

program.parse(process.argv);
