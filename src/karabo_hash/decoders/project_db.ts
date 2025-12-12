import { Hash, HashValue } from 'karabo-ts';
import {
  DbItemInfo,
  ListDomainsResult,
  ListProjectsResult,
  LoadProjectItemsResult,
  ProjectItemInfo,
} from '../../karabo_data/ProjectDbInfo';
import { XMLParser } from 'fast-xml-parser';

export const listDomainsResultFromHash = (hash: Hash): ListDomainsResult => {
  const reason = hash.getValue('reason') as string;
  return {
    error_msg: reason.length == 0 ? undefined : reason,
    domains:
      reason.length > 0 ? [] : (hash.getValue('reply.domains') as string[]),
  };
};

export const listProjectsResultFromHash = (hash: Hash): ListProjectsResult => {
  const reason = hash.getValue('reason') as string;
  if (reason.length > 0) {
    // An error occurred
    return { error_msg: reason, projects: [] };
  } else {
    const itemsHashes = hash.getValue('reply.items') as HashValue[];
    const domain = hash.getValue('request.args.domain') as string;
    const projects: ProjectItemInfo[] = itemsHashes.map((hv: HashValue) => {
      const item: Hash = new Hash(hv);
      return {
        domain: domain,
        uuid: item.getValue('uuid') as string,
        name: item.getValue('simple_name') as string,
        dateModified: item.getValue('date') as string,
        isTrashed: item.getValue('is_trashed') as boolean,
        item_type: 'project',
      };
    });
    return { error_msg: undefined, projects: projects };
  }
};

export const loadProjectItemsResultFromHash = (
  projectName: string,
  hash: Hash
): LoadProjectItemsResult => {
  const reason = hash.getValue('reason') as string;
  if (reason.length > 0) {
    // An error occurred
    return { error_msg: reason, projectItems: [] };
  } else {
    const items: DbItemInfo[] = [];
    const itemHashes = hash.getValue('reply.items') as unknown as HashValue[];
    //console.log(itemHashes);
    for (let i = 0; i < itemHashes.length; i++) {
      const item = new Hash(itemHashes[i]);
      const domain = item.getValue('domain') as string;
      const uuid = item.getValue('uuid') as string;
      const xml = item.getValue('xml') as string;
      const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: '@_',
        allowBooleanAttributes: true,
      });
      //console.log(xml);
      const xmlObj = parser.parse(xml);
      const itemType = xmlObj.xml['@_item_type'];
      if (itemType === 'project') {
        // Build a ProjectContentsInfo object
        const scenes: DbItemInfo[] = [];
        const xmlScenes =
          // Some XML's have an "artificial" root and some not
          xmlObj.xml['root'] !== undefined
            ? xmlObj.xml.root.project.scenes
            : xmlObj.xml.project.scenes;
        if (xmlScenes['KRB_Item'] !== undefined) {
          for (let i = 0; i < xmlScenes.KRB_Item.length; i++) {
            scenes.push({
              domain: domain,
              uuid: xmlScenes.KRB_Item[i].uuid['#text'],
              item_type: itemType,
            });
          }
        }
        const subprojects: DbItemInfo[] = [];
        const xmlSubprojects =
          // Some XML's have an "artificial" root and some not
          xmlObj.xml['root'] !== undefined
            ? xmlObj.xml.root.project.subprojects
            : xmlObj.xml.project.subprojects;
        if (xmlSubprojects['KRB_Item'] !== undefined) {
          for (let i = 0; i < xmlSubprojects.KRB_Item.length; i++) {
            subprojects.push({
              domain: domain,
              uuid: xmlSubprojects.KRB_Item[i].uuid['#text'],
              item_type: 'project', // A subproject is a project
            });
          }
        }
        const item = {
          domain: domain,
          uuid: uuid,
          name: xmlObj.xml['@_simple_name'],
          isTrashed: xmlObj.xml['@_is_trashed'],
          dateModified: xmlObj.xml['@_date'],
          scenes: scenes,
          subprojects: subprojects,
          item_type: itemType,
        };
        items.push(item);
      } else if (itemType === 'scene') {
        // Build a ProjectSceneInfo object
        const item = {
          domain: domain,
          projectName: projectName,
          uuid: uuid,
          name: xmlObj.xml['@_simple_name'],
          description: xmlObj.xml['@_description'],
          dateModified: xmlObj.xml['@_date'],
          // NOTE: Some older scenes have the root element of the svg as "svg",
          //       while some newer scenes have "svg:svg"
          svg:
            xmlObj.xml['svg:svg'] != undefined
              ? JSON.stringify(xmlObj.xml['svg:svg'])
              : JSON.stringify(xmlObj.xml['svg']),
          item_type: itemType,
        };
        //console.log(item);
        items.push(item);
      }
    }
    return {
      projectItems: items,
    };
  }
};
