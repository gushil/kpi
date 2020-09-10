import {
  parsePermissions,
  assign,
} from './utils';

export function parseTags (asset) {
  return {
    tags: asset.tag_string.split(',').filter((tg) => { return tg.length !== 0; })
  };
}

function parseSettings (asset) {
  var settings = asset.content && asset.content.settings;
  if (settings) {
    if (settings.length) {
      settings = settings[0];
    }
    return {
      unparsed__settings: settings,
      settings__style: settings.style !== undefined ? settings.style : '',
      settings__title: settings.title,
      settings__version: settings.version !== undefined ? settings.version : '',
      settings__form_id: settings.form_id !== undefined ? settings.form_id : (settings.id_string !== undefined ? settings.id_string : '')
    };
  } else {
    return {};
  }
}

export function parsed (asset) {
  return assign(asset,
      parseSettings(asset),
      parseTags(asset));
}
