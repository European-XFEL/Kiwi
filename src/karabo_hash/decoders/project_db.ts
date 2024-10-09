import { Hash, HashValue } from "karabo-ts";
import {
  DbItemInfo,
  ListDomainsResult,
  ListProjectsResult,
  LoadProjectItemsResult,
  ProjectItemInfo,
} from "../../karabo_data/ProjectDbInfo";
import { XMLParser } from "fast-xml-parser";

export const beginUserSessionResultFromHash = (hash: Hash): boolean => {
  return hash.value.success.value.value_ as boolean;
};

export const listDomainsResultFromHash = (hash: Hash): ListDomainsResult => {
  const reason = hash.value.reply.value.value_.reason.value.value_ as string;
  return {
    error_msg: reason.length == 0 ? undefined : reason,
    domains:
      reason.length > 0
        ? []
        : (hash.value.reply.value.value_.domains.value.value_ as string[]),
  };
};

export const listProjectsResultFromHash = (hash: Hash): ListProjectsResult => {
  const reason = hash.value.reply.value.value_.reason.value.value_ as string;
  if (reason.length > 0) {
    // An error occurred
    return { error_msg: reason, projects: [] };
  } else {
    const itemsHashes = hash.value.reply.value.value_.items.value.value_;
    const domain =
      hash.value.request.value.value_.args.value.value.domain.value.value_;
    const projects: ProjectItemInfo[] = itemsHashes.map((item: HashValue) => {
      return{
        domain: domain,
        uuid: item.uuid.value.value_,
        name: item.simple_name.value.value_,
        dateModified: item.date.value.value_,
        isTrashed: item.is_trashed.value.value_.toLowerCase() === "true"
      };
    });
    return { error_msg: undefined, projects: projects };
  }
};

export const loadProjectItemsResultFromHash = (
  projectName: string,
  hash: Hash
): LoadProjectItemsResult => {
  const reason = hash.value.reply.value.value_.reason.value.value_ as string;
  if (reason.length > 0) {
    // An error occurred
    return { error_msg: reason, projectItems: [] };
  } else {
    const items: DbItemInfo[] = [];
    const itemHashes = hash.value.reply.value.value_.items.value.value_;
    for (let i = 0; i < itemHashes.length; i++) {
      const item = itemHashes[i];
      const domain = item.domain.value.value_;
      const uuid = item.uuid.value.value_;
      const xml = item.xml.value.value_;
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "@_",
        allowBooleanAttributes: true,
      });
      const xmlObj = parser.parse(xml);
      const itemType = xmlObj.xml["@_item_type"];
      if (itemType === "project") {
        // Build a ProjectContentsInfo object
        const scenes: DbItemInfo[] = [];
        const xmlScenes =
          // Some XML's have an "artificial" root and some not
          xmlObj.xml["root"] !== undefined
            ? xmlObj.xml.root.project.scenes
            : xmlObj.xml.project.scenes;
        if (xmlScenes["KRB_Item"] !== undefined) {
          for (let i = 0; i < xmlScenes.KRB_Item.length; i++) {
            scenes.push({
              domain: domain,
              uuid: xmlScenes.KRB_Item[i].uuid["#text"],
            });
          }
        }
        const subprojects: DbItemInfo[] = [];
        const xmlSubprojects =
          // Some XML's have an "artificial" root and some not
          xmlObj.xml["root"] !== undefined
            ? xmlObj.xml.root.project.subprojects
            : xmlObj.xml.project.subprojects;
        if (xmlSubprojects["KRB_Item"] !== undefined) {
          for (let i = 0; i < xmlSubprojects.KRB_Item.length; i++) {
            subprojects.push({
              domain: domain,
              uuid: xmlSubprojects.KRB_Item[i].uuid["#text"],
            });
          }
        }
        const item = {
          domain: domain,
          uuid: uuid,
          name: xmlObj.xml["@_simple_name"],
          isTrashed: xmlObj.xml["@_is_trashed"],
          dateModified: xmlObj.xml["@_date"],
          scenes: scenes,
          subprojects: subprojects,
        };
        items.push(item);
      } else if (itemType === "scene") {
        // Build a ProjectSceneInfo object
        const item = {
          domain: domain,
          projectName: projectName,
          uuid: uuid,
          name: xmlObj.xml["@_simple_name"],
          description: xmlObj.xml["@_description"],
          dateModified: xmlObj.xml["@_date"],
          // NOTE: Some older scenes have the root element of the svg as "svg",
          //       while some newer scenes have "svg:svg"
          svg:
            xmlObj.xml["svg:svg"] != undefined
              ? JSON.stringify(xmlObj.xml["svg:svg"])
              : JSON.stringify(xmlObj.xml["svg"]),
        };
        items.push(item);
      }
    }
    return {
      projectItems: items,
    };
  }
};
