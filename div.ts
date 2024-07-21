import { globSync } from "glob";
import { divider } from "./lib/divider";
import { batchProcess } from "./lib/utils";

export async function divJs(
  htmlSearchPatterns: string[],
  destinationBasePath: string,
  baseSearchPath: string = process.cwd(),
  ignorePatterns: string[] = []
): Promise<void> {
  ignorePatterns = [
    ...ignorePatterns,
    "./node_modules/**",
    `./${destinationBasePath}/**`,
  ];

  const htmlFilePaths: string[] = globSync(htmlSearchPatterns, {
    cwd: baseSearchPath,
    absolute: true,
    ignore: ignorePatterns,
  });

  const promises = new Array();

  for (const htmlPath of htmlFilePaths) {
    const proc = () => {
      return divider(htmlPath, destinationBasePath);
    };

    promises.push(proc);
  }

  const MPP: number = 100; //memory per process
  await batchProcess(promises, MPP);
}
