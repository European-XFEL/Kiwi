import { Hash } from "../types";
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
  const reason = hash.value.reply.value.value.reason.value.value_ as string;
  return {
    error_msg: reason.length == 0 ? undefined : reason,
    domains:
      reason.length > 0
        ? []
        : (hash.value.reply.value.value.domains.value.value_ as string[]),
  };
};

export const listProjectsResultFromHash = (hash: Hash): ListProjectsResult => {
  const reason = hash.value.reply.value.value.reason.value.value_ as string;
  if (reason.length > 0) {
    // An error occurred
    return { error_msg: reason, projects: [] };
  } else {
    const projects: ProjectItemInfo[] = [];
    const itemsHashes = hash.value.reply.value.value.items.value;
    const domain =
      hash.value.request.value.value.args.value.value.domain.value.value_;
    for (let i = 0; i < itemsHashes.length; i++) {
      const uuid = itemsHashes[i].value.uuid.value.value_;
      const name = itemsHashes[i].value.simple_name.value.value_;
      const date = itemsHashes[i].value.date.value.value_;
      const isTrashed =
        itemsHashes[i].value.is_trashed.value.value_.toLowerCase() === "true";
      projects.push({
        domain: domain,
        uuid: uuid,
        name: name,
        dateModified: date,
        isTrashed: isTrashed,
      });
    }
    return { error_msg: undefined, projects: projects };
  }
};

export const loadProjectItemsResultFromHash = (
  hash: Hash
): LoadProjectItemsResult => {
  const reason = hash.value.reply.value.value.reason.value.value_ as string;
  if (reason.length > 0) {
    // An error occurred
    return { error_msg: reason, projectItems: [] };
  } else {
    const items: DbItemInfo[] = [];
    const itemHashes = hash.value.reply.value.value.items.value;
    for (let i = 0; i < itemHashes.length; i++) {
      const domain = itemHashes[i].value.domain.value.value_;
      const uuid = itemHashes[i].value.uuid.value.value_;
      const xml = itemHashes[i].value.xml.value.value_;
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
          uuid: uuid,
          name: xmlObj.xml["@_simple_name"],
          description: xmlObj.xml["@_description"],
          dateModified: xmlObj.xml["@_date"],
          svg: xmlObj.svg,
        };
        items.push(item);
      }
    }
    return {
      projectItems: items,
    };
  }
};
