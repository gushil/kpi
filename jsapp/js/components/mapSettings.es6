import $ from 'jquery';
import React from 'react';
import reactMixin from 'react-mixin';
import Reflux from 'reflux';
import Select from 'react-select';
import bem from '../bem';
import ui from '../ui';
import { assign, t, validFileTypes } from '../utils';
import autoBind from 'react-autobind';
import actions from '../actions';
import { dataInterface } from '../dataInterface';
import Dropzone from 'react-dropzone';
import alertify from 'alertifyjs';

class MapSettings extends React.Component {
  constructor(props) {
    super(props);
    autoBind(this);

    var geoPointQuestions = [];

    props.asset.content.survey.forEach(function(question) {
      if (question.type && question.type === 'geopoint') {
        geoPointQuestions.push({
          value: question.name || question.$autoname,
          label: question.label[0]
        });
      }
    });

    this.state = {
      activeModalTab: geoPointQuestions.length > 1 ? 'geoquestion' : 'overlays',
      geoPointQuestions: geoPointQuestions,
      defaultMapSettings: this.props.asset.map_styles,
      files: [],
      layerName: ''
    };
  }
  componentDidMount() {
    actions.resources.getAssetFiles(this.props.asset.uid);
    this.listenTo(
      actions.resources.getAssetFiles.completed,
      this.updateFileList
    );
  }
  toggleTab(evt) {
    var n = evt.target.getAttribute('data-tabname');
    this.setState({
      activeModalTab: n
    });
  }
  geoPointQuestionChange(evt) {
    let settings = this.state.defaultMapSettings;
    settings.GeoPointQuestion = evt.target.value;
    this.setState({ defaultMapSettings: settings });
  }
  saveMapSettings() {
    let settings = this.state.defaultMapSettings,
      assetUid = this.props.asset.uid;

    actions.map.setMapSettings(assetUid, settings);
    this.props.toggleMapSettings();
  }
  updateFileList(data) {
    if (data.results) {
      this.setState({ files: data.results });
    }
  }
  dropFiles(files, rejectedFiles) {
    let uid = this.props.asset.uid,
      _this = this,
      name = this.state.layerName;

    if (!name) {
      alertify.error(t('Please add a name for your layer file.'));
      return false;
    }

    files.map(file => {
      let metadata = {
        type: file.name.split('.').pop(),
        size: file.size
      };
      let data = {
        content: file,
        name: name,
        file_type: 'map_layer',
        metadata: JSON.stringify(metadata)
      };
      dataInterface.uploadAssetFile(uid, data).done(result => {
        _this.setState({ layerName: '' });
        actions.resources.getAssetFiles(this.props.asset.uid);
      });
    });

    rejectedFiles.map(rej => {
      var errMsg = t('Upload error: could not recognize Excel file.');
      alertify.error(errMsg);
    });
  }
  layerNameChange(e) {
    this.setState({ layerName: e.target.value });
  }
  deleteFile(evt) {
    let el = $(evt.target)
        .closest('[data-uid]')
        .get(0),
      uid = el.getAttribute('data-uid'),
      dialog = alertify.dialog('confirm');

    let opts = {
      title: t('Delete File'),
      message: t(
        'Are you sure you want to delete this file? ' +
          '<br/><br/><strong>This action cannot be undone.</strong>'
      ),
      labels: { ok: t('Delete'), cancel: t('Cancel') },
      onok: (evt, val) => {
        dataInterface.deleteAssetFile(this.props.asset.uid, uid).done(r => {
          actions.resources.getAssetFiles(this.props.asset.uid);
          dialog.destroy();
        });
      },
      oncancel: () => {
        dialog.destroy();
      }
    };
    dialog.set(opts).show();
  }
  tabLabel(tab) {
    switch (tab) {
      case 'overlays':
        return t('Overlays');
      case 'colors':
        return t('Colors');
      case 'geoquestion':
        return t('Geopoint question to display');
    }
  }
  colorRows() {
    let colorRows = [];
    for (let i = 1; i < 20; i++) {
      colorRows.push(<span key={i} className={`map-marker map-marker-${i}`} />);
    }
    return colorRows;
  }
  render() {
    let asset = this.props.asset,
      geoPointQuestions = this.state.geoPointQuestions,
      activeTab = this.state.activeModalTab;

    var tabs = ['overlays', 'colors'];

    if (geoPointQuestions.length > 1) {
      tabs.unshift('geoquestion');
    }

    var modalTabs = tabs.map(function(tab, i) {
      return (
        <button
          className={`mdl-button mdl-button--tab ${
            this.state.activeModalTab === tab ? 'active' : ''
          }`}
          onClick={this.toggleTab}
          data-tabname={tab}
          key={i}
        >
          {this.tabLabel(tab)}
        </button>
      );
    }, this);
    return (
      <bem.GraphSettings>
        <ui.Modal.Tabs>{modalTabs}</ui.Modal.Tabs>
        <ui.Modal.Body>
          <div className="tabs-content map-settings">
            {activeTab === 'geoquestion' && (
              <div className="map-settings__GeopointQuestions">
                <p>
                  {t(
                    'Choose the Geopoint question you would like to display on the map:'
                  )}
                </p>
                {geoPointQuestions.map((question, i) => {
                  return (
                    <label htmlFor={'GeopointQuestion-' + i} key={i}>
                      <input
                        type="radio"
                        name="trnsltn"
                        value={question.value}
                        onChange={this.geoPointQuestionChange}
                        checked={
                          this.state.defaultMapSettings.GeoPointQuestion ===
                          question.value
                            ? true
                            : false
                        }
                        id={'GeopointQuestion-' + i}
                      />
                      {question.label}
                    </label>
                  );
                })}
              </div>
            )}
            {activeTab === 'overlays' && (
              <div className="map-settings__overlay">
                {this.state.files.length > 0 && (
                  <bem.FormModal__item m="list-files">
                    <label>{t('Uploaded layers')}</label>
                    {this.state.files.map((file, i) => {
                      return (
                        <div className="list-file-row" key={i}>
                          <span className="file-type">
                            {file.metadata.type}
                          </span>
                          <span className="file-layer-name">{file.name}</span>
                          <span
                            className="file-delete"
                            onClick={this.deleteFile}
                            data-tip={t('Delete layer')}
                            data-uid={file.uid}
                          >
                            <i className="k-icon-trash" />
                          </span>
                        </div>
                      );
                    })}
                  </bem.FormModal__item>
                )}
                <bem.FormModal__item m="layer-upload">
                  <label htmlFor="name">
                    {t(
                      'Use the form below to upload files with map data in one of these formats: CSV, KML, WKT or GEOJSON. The data will be made available as layers for display on the map.'
                    )}
                  </label>
                  <input
                    type="text"
                    id="name"
                    placeholder={t('Layer name')}
                    value={this.state.layerName}
                    onChange={this.layerNameChange}
                  />
                  <Dropzone
                    onDrop={this.dropFiles}
                    multiple={false}
                    className="dropzone"
                    accept={'.csv,.kml,.geojson,.wkt,.json'}
                  >
                    <button className="mdl-button mdl-button--raised mdl-button--colored">
                      {t('Upload')}
                    </button>
                  </Dropzone>
                </bem.FormModal__item>
              </div>
            )}
            {activeTab === 'colors' && (
              <div className="map-settings__colors">
                <div className="map-color-style s1">{this.colorRows()}</div>
                <div className="map-color-style s2">{this.colorRows()}</div>
              </div>
            )}
          </div>
        </ui.Modal.Body>

        {activeTab === 'geoquestion' && (
          <ui.Modal.Footer>
            <button
              className="mdl-button primary"
              onClick={this.saveMapSettings}
            >
              {t('Save')}
            </button>
          </ui.Modal.Footer>
        )}
      </bem.GraphSettings>
    );
  }
}

reactMixin(MapSettings.prototype, Reflux.ListenerMixin);

export default MapSettings;