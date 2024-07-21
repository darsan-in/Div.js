import { Element, load } from "cheerio";
import { parse, stringify } from "css";
import MQS from "css-mediaquery";
import { readFileSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { cloneDeep } from "lodash";
import { basename, dirname, join, relative, resolve } from "path";
import configurations from "../configLoader";
import { screenCats } from "./options";
import { makeDirf } from "./utils";
const { screenSizes } = configurations;

function _getCSSLinks(htmlFilePath: string): Promise<string[]> {
  htmlFilePath = resolve(htmlFilePath); //making abs path

  const cssLinks: string[] = [];

  return new Promise((resolve, reject) => {
    readFile(htmlFilePath, { encoding: "utf8" })
      .then((htmlContent: string) => {
        const $ = load(htmlContent);

        $('link[rel="stylesheet"]').each((_index: number, element: Element) => {
          cssLinks.push(
            join(dirname(htmlFilePath), $(element).attr("href") ?? "")
          );
        });

        resolve(cssLinks);
      })
      .catch(reject);
  });
}

function _writeCSS(
  newCssFilePath: string,
  stylesheet: Record<string, any>
): Promise<void> {
  return new Promise((resolve, reject) => {
    makeDirf(dirname(newCssFilePath));

    writeFile(newCssFilePath, stringify(stylesheet), { encoding: "utf8" })
      .then(resolve)
      .catch(reject);
  });
}

function _replaceCSSLinks(
  htmlPath: string,
  destinationPath: string,
  newcssLinks: string[]
): Promise<void> {
  return new Promise((resolve, reject) => {
    readFile(htmlPath, { encoding: "utf8" })
      .then((htmlString: string) => {
        const $ = load(htmlString);

        //remove old links
        $('link[rel="stylesheet"]').remove();

        for (const cssLink of newcssLinks) {
          const mediaquery: string = `screen and (max-width: ${
            /* @ts-ignore */
            screenSizes[basename(cssLink, ".css").slice(-2)]
          }px)`;

          const csstag = $(
            `<link rel="stylesheet" href="${cssLink}" media="${mediaquery}">`
          );

          $("head").append(csstag);
        }

        makeDirf(dirname(destinationPath));

        //write to files
        writeFile(destinationPath, $.html() ?? "")
          .then(resolve)
          .catch(reject);
      })
      .catch(reject);
  });
}

export async function divider(
  htmlFilePath: string,
  destinationBasePath: string
) {
  const destinationHtmlPath: string = join(
    destinationBasePath,
    relative(process.cwd(), htmlFilePath)
  );

  //getting css link from html
  const oldCssLinks: string[] = await _getCSSLinks(htmlFilePath);

  //combined CSS metas
  let combinedCSSContent: string = "";
  let combinedFileName: string = "";

  oldCssLinks.forEach((cssLink: string) => {
    const cssContent: string = readFileSync(cssLink, { encoding: "utf8" });

    combinedFileName = `${combinedFileName}-${basename(cssLink, ".css")}`;
    combinedCSSContent = combinedCSSContent + "\n" + cssContent;
  });

  //setting reciept watermark in css filename
  const watermark: string = "~div-js";
  combinedFileName = combinedFileName + watermark;

  //combined css getting splitted by diff screen dependency
  const renderedCSS = parse(combinedCSSContent);

  //get media blocks with min or max width conditions
  const cssWithMediaQueries =
    cloneDeep(renderedCSS).stylesheet?.rules.filter(
      (rule) =>
        rule.type === "media" &&
        /* @ts-ignore */
        (rule.media.includes("max-width") || rule.media.includes("min-width"))
    ) ?? ([] as any);

  //Non-Device dependant stylesheet
  const commonCSS = cloneDeep(renderedCSS);
  /* @ts-ignore */
  commonCSS.stylesheet.rules = commonCSS.stylesheet?.rules.filter((rule) => {
    if (
      //retain all possible rules except media
      rule.type === "rule" ||
      rule.type === "keyframes" ||
      rule.type === "font-face" ||
      rule.type === "supports" ||
      rule.type === "page" ||
      rule.type === "charset" ||
      rule.type === "import" ||
      rule.type === "document" ||
      rule.type === "namespace"
    ) {
      return true;
    } else if (
      //retain media css if that is not about max and min width
      rule.type === "media" &&
      /* @ts-ignore */
      !rule.media.includes("max-width") &&
      /* @ts-ignore */
      !rule.media.includes("min-width")
    ) {
      return true;
    }

    return false;
  }) as any;

  //Device dependant stylesheets
  const deviceDependantStylesheets: Partial<Record<screenCats, any>> = {};

  //list for newly generated links
  const newCssLinks: string[] = [];

  //Iterations on Different ScreenSizes
  for (const screenKey of Object.keys(screenSizes)) {
    //copy of original css
    deviceDependantStylesheets[screenKey as screenCats] =
      cloneDeep(renderedCSS);

    //filter to retain device dependant stylesheet
    deviceDependantStylesheets[screenKey as screenCats].stylesheet.rules =
      cloneDeep(cssWithMediaQueries).filter((rule: any) => {
        //emulating media query function
        const mediaQueryMatched: boolean = MQS.match(rule.media, {
          /* @ts-ignore */
          type: "screen",
          width: `${screenSizes[screenKey as screenCats]}px`,
        });

        return mediaQueryMatched;
      });

    //combine common and deviceDependant
    deviceDependantStylesheets[screenKey as screenCats].stylesheet.rules =
      deviceDependantStylesheets[
        screenKey as screenCats
      ].stylesheet.rules.concat(commonCSS.stylesheet?.rules ?? []);

    const dirNameofCSS: string = relative(
      process.cwd(),
      dirname(oldCssLinks[0])
    );

    const newCssFilePath: string = join(
      destinationBasePath,
      dirNameofCSS,
      `${combinedFileName}@${screenKey}.css`
    );

    const relativeCssPath: string = relative(
      dirname(destinationHtmlPath),
      newCssFilePath
    );

    newCssLinks.push(relativeCssPath);

    await _writeCSS(
      newCssFilePath,
      deviceDependantStylesheets[screenKey as screenCats]
    );
  }

  return new Promise((resolve, reject) => {
    //replace links
    _replaceCSSLinks(htmlFilePath, destinationHtmlPath, newCssLinks)
      .then(resolve)
      .catch(reject);
  });
}
