import React from 'react';
import PropTypes from 'prop-types';
import reactMixin from 'react-mixin';
import autoBind from 'react-autobind';
import $ from 'jquery';
import { Link } from 'react-router';
import {bem} from '../bem';
import ui from '../ui';
import {stores} from '../stores';
import mixins from '../mixins';
import {
  KEY_CODES,
  ASSET_TYPES
} from 'js/constants';
import TagInput from '../components/tagInput';
import {
  formatTime,
  t
} from '../utils';
import assetUtils from 'js/assetUtils';

class AssetRow extends React.Component {
  constructor(props){
    super(props);
    this.state = {
      isTagsInputVisible: false,
      clearPopover: false,
      popoverVisible: false
    };
    this.escFunction = this.escFunction.bind(this);
    autoBind(this);
  }

  clickAssetButton (evt) {
    var clickedActionIcon = $(evt.target).closest('[data-action]').get(0);
    if (clickedActionIcon) {
      var action = clickedActionIcon.getAttribute('data-action');
      var name = clickedActionIcon.getAttribute('data-asset-name') || t('untitled');
      stores.selectedAsset.toggleSelect(this.props.uid, true);
      this.props.onActionButtonClick(action, this.props.uid, name);
    }
  }

  clickTagsToggle () {
    const isTagsInputVisible = !this.state.isTagsInputVisible;
    if (isTagsInputVisible) {
      document.addEventListener('keydown', this.escFunction);
    } else {
      document.removeEventListener('keydown', this.escFunction);
    }
    this.setState({isTagsInputVisible: isTagsInputVisible});
  }

  escFunction (evt) {
    if (evt.keyCode === KEY_CODES.ESC && this.state.isTagsInputVisible) {
      this.clickTagsToggle();
    }
  }

  moveToCollection (evt) {
    assetUtils.moveToCollection(this.props.uid, evt.currentTarget.dataset.collid);
  }

  clearPopover () {
    if (this.state.popoverVisible) {
      this.setState({clearPopover: true, popoverVisible: false});
    }
  }

  popoverSetVisible () {
    this.setState({popoverVisible: true});
  }

  render () {
    const isSelfOwned = this.userIsOwner(this.props);
    var _rc = this.props.summary && this.props.summary.row_count || 0;

    var hrefTo = `/forms/${this.props.uid}`,
        tags = this.props.tags || [],
        ownedCollections = [],
        parent = undefined;

    var isDeployable = this.props.asset_type && this.props.asset_type === ASSET_TYPES.survey.id && this.props.deployed_version_id === null;

    // const userCanEdit = this.userCan('change_asset', this.props);
    const userCanEdit = true;

    const assetName = this.props.name || this.props.firstQuestionLabel;

    if (this.props.has_deployment && this.props.deployment__submission_count &&
        this.userCan('view_submissions', this.props)) {
      hrefTo = `/forms/${this.props.uid}/summary`;
    }

    if (this.isLibrary()) {
      hrefTo = `/library/${this.props.uid}/edit`;
      parent = this.props.parent || undefined;
      ownedCollections = this.props.ownedCollections.map(function(c){
        var p = false;
        if (parent != undefined && parent.indexOf(c.uid) !== -1) {
          p = true;
        }
        return {
          value: c.uid,
          label: c.name || c.uid,
          hasParent: p
        };
      });
      this.props.downloads = this.props.downloads.filter(dl => dl.format !== 'xml');
    }

    var settings_version = '';
    if (this.props.summary && this.props.summary.settings_version) {
      settings_version = this.props.summary.settings_version;
    }

    return (
        <bem.AssetRow
          m={{
            'display-tags': this.state.isTagsInputVisible,
            'deleted': this.props.deleted,
            'deleting': this.props.deleting,
          }}
          className='mdl-grid'
          key={this.props.uid}
          onMouseLeave={this.clearPopover}
        >
          <bem.AssetRow__cell
            m={'asset-details'}
            key={'asset-details'}
            onClick={this.clickAssetButton}
            data-asset-type={this.props.kind}
          >
            <Link
              to={hrefTo}
              data-kind={this.props.kind}
              data-asset-type={this.props.kind}
              draggable={false}
              className='asset-row__link-overlay'
            />

            {/* "title" column */}
            <bem.AssetRow__cell
              m={'title'}
              className={['mdl-cell', this.props.asset_type == ASSET_TYPES.survey.id ? 'mdl-cell--3-col mdl-cell--4-col-tablet mdl-cell--2-col-phone' : 'mdl-cell--3-col mdl-cell--1-col-tablet mdl-cell--1-col-phone']}
            >
              { this.props.asset_type && (
                  this.props.asset_type == ASSET_TYPES.template.id ||
                  this.props.asset_type == ASSET_TYPES.block.id ||
                  this.props.asset_type == ASSET_TYPES.question.id
                ) &&
                <i className={`row-icon row-icon--${this.props.asset_type}`}>{_rc}</i>
              }
              <bem.AssetRow__cell m='name'>
                <ui.AssetName {...this.props} />
              </bem.AssetRow__cell>
              { this.props.asset_type && this.props.asset_type === ASSET_TYPES.survey.id && this.props.settings.description &&
                <bem.AssetRow__description>
                  {this.props.settings.description}
                </bem.AssetRow__description>
              }
            </bem.AssetRow__cell>

            {/* "version" column for library types */}
            { this.props.asset_type && (
                this.props.asset_type == ASSET_TYPES.template.id ||
                this.props.asset_type == ASSET_TYPES.block.id ||
                this.props.asset_type == ASSET_TYPES.question.id
              ) &&
              <bem.AssetRow__cell
                m={'version'}
                className={['mdl-cell mdl-cell--1-col mdl-cell--1-col-tablet mdl-cell--1-col-phone']}
              >
                {settings_version}
              </bem.AssetRow__cell>
            }

            {/* "type" column for library types */}
            { this.props.asset_type && (
                this.props.asset_type == ASSET_TYPES.template.id ||
                this.props.asset_type == ASSET_TYPES.block.id ||
                this.props.asset_type == ASSET_TYPES.question.id
              ) &&
              <bem.AssetRow__cell
                m={'type'}
                className={['mdl-cell mdl-cell--1-col mdl-cell--1-col-tablet mdl-cell--hide-phone']}
              >
                {ASSET_TYPES[this.props.asset_type].label}
              </bem.AssetRow__cell>
            }

            {/* "user" column */}
            <bem.AssetRow__cell
              m={'userlink'}
              key={'userlink'}
              className={[
                'mdl-cell',
                this.props.asset_type == ASSET_TYPES.survey.id ? 'mdl-cell--1-col mdl-cell--1-col-tablet mdl-cell--hide-phone' : 'mdl-cell--2-col mdl-cell--1-col-tablet mdl-cell--1-col-phone'
              ]}
            >
              { this.props.asset_type == ASSET_TYPES.survey.id &&
                <span>{ isSelfOwned ? ' ' : this.props.owner__username }</span>
              }
              { this.props.asset_type != ASSET_TYPES.survey.id &&
                <span>{isSelfOwned ? t('me') : this.props.owner__username}</span>
              }
            </bem.AssetRow__cell>

            {/* "date created" column for surveys */}
            { this.props.asset_type == ASSET_TYPES.survey.id &&
              <bem.AssetRow__cell m={'date-created'}
                  key={'date-created'}
                  className='mdl-cell mdl-cell--2-col mdl-cell--hide-tablet mdl-cell--hide-phone'
                  >
                <span className='date date--created'>{formatTime(this.props.date_created)}</span>
              </bem.AssetRow__cell>
            }
            {/* "date modified" column */}
            <bem.AssetRow__cell
              m={'date-modified'}
              key={'date-modified'}
              className={['mdl-cell mdl-cell--2-col mdl-cell--2-col-tablet mdl-cell--hide-phone']}
            >
              <span className='date date--modified'>{formatTime(this.props.date_modified)}</span>
            </bem.AssetRow__cell>

            {/* "submission count" column for surveys */}
            { this.props.asset_type == ASSET_TYPES.survey.id &&
              <bem.AssetRow__cell
                m={'submission-count'}
                key={'submisson-count'}
                className='mdl-cell mdl-cell--1-col mdl-cell--1-col-tablet mdl-cell--1-col-phone'
              >
                {
                  this.props.deployment__submission_count ?
                    this.props.deployment__submission_count : 0
                }
              </bem.AssetRow__cell>
            }
            
            {/* "actions" column */}
            <bem.AssetRow__cell
              m={'actions'}
              key={'actions'}
              className={['mdl-cell mdl-cell--3-col mdl-cell--2-col-tablet mdl-cell--1-col-phone cell-actions']}
            >
              {userCanEdit &&
                <bem.AssetRow__actionIcon
                    m='edit'
                    key='edit'
                    data-action='edit'
                    data-tip={t('Edit')}
                    data-asset-type={this.props.kind}
                    data-disabled={false}
                    >
                  <i className='k-icon-edit' />
                </bem.AssetRow__actionIcon>
              }

              {userCanEdit &&
                <bem.AssetRow__actionIcon
                    m='tagsToggle'
                    onClick={this.clickTagsToggle}
                    data-tip= {t('Labels')}
                    >
                  <i className='k-icon-tag' />
                </bem.AssetRow__actionIcon>
              }

              <bem.AssetRow__actionIcon
                  m='clone'
                  key='clone'
                  data-action='clone'
                  data-tip={t('Clone')}
                  data-asset-type={this.props.kind}
                  data-asset-name={assetName}
                  data-disabled={false}
                  >
                <i className='k-icon-clone' />
              </bem.AssetRow__actionIcon>

              { this.props.kind === 'collection' &&
                [/*'view',*/ 'sharing'].map((actn)=>{
                  return (
                        <bem.AssetRow__actionIcon
                          m={actn === 'view' ? 'view-collection' : actn}
                            data-action={actn}
                            data-asset-type={this.props.kind}
                            data-disabled={false}
                            data-tip={actn}
                            >
                          <i />
                        </bem.AssetRow__actionIcon>
                      );
                })
              }
              
              { this.props.asset_type && this.props.asset_type === ASSET_TYPES.survey.id && this.props.has_deployment && !this.props.deployment__active && userCanEdit &&
                <bem.AssetRow__actionIcon
                      m={'unarchive'}
                      data-action={'unarchive'}
                      data-asset-type={this.props.kind}
                    >
                  <i className='k-icon-archived' />
                  {t('Unarchive')}
                </bem.AssetRow__actionIcon>
              }
              { this.props.asset_type && this.props.asset_type === ASSET_TYPES.survey.id && userCanEdit &&
                <bem.AssetRow__actionIcon
                  m={'refresh'}
                  data-action={'refresh'}
                  data-asset-type={this.props.kind}
                  data-tip={t('Replace form')}
                >
                  <i className='k-icon-replace' />
                </bem.AssetRow__actionIcon>
              }
              { userCanEdit && !this.isLibrary() &&
                <bem.AssetRow__actionIcon
                  data-action={'translations'}
                  data-asset-uid={this.props.uid}
                  data-tip={t('Manage Translations')}
                >
                  <i className='k-icon-language' />
                </bem.AssetRow__actionIcon>
              }
              {this.props.downloads.map((dl)=>{
                const format = dl.format.toString().toUpperCase();
                return (
                    <bem.AssetRow__actionIcon 
                      m={`dl-${dl.format}`} 
                      href={dl.url}
                      key={`dl-${dl.format}`}
                      data-tip={`${t('Download')} ${format}`}
                    >
                      <i className={`k-icon-${dl.format}-file`}/>
                    </bem.AssetRow__actionIcon>
                  );
              })}
              { this.props.asset_type && this.props.asset_type != ASSET_TYPES.survey.id &&
                <ui.PopoverMenu
                  type='assetrow-menu'
                  triggerLabel={<i className='k-icon-folder-move-to' />}
                  triggerTip={t('Manage collection')}
                  popoverSetVisible={this.popoverSetVisible}
                >
                  { ownedCollections.length <= 0 &&
                    <bem.PopoverMenu__heading>
                      {t('None available')}
                    </bem.PopoverMenu__heading>
                  }
                  { ownedCollections.length > 0 &&
                    <bem.PopoverMenu__moveTo>
                      {ownedCollections.map((col)=>{
                        return (
                            <bem.PopoverMenu__item
                              onClick={this.moveToCollection}
                              data-collid={col.value}
                              data-parent={col.hasParent ? 'true' : 'false'}
                              key={col.value}
                              title={col.label}
                              m='move-coll-item'>
                                <i className='k-icon-folder' />
                                {col.label}
                                {col.hasParent &&
                                  <span className='has-parent'>&bull;</span>
                                }
                            </bem.PopoverMenu__item>
                          );
                      })}
                    </bem.PopoverMenu__moveTo>
                  }
                </ui.PopoverMenu>
              }
              { this.props.asset_type && this.props.asset_type === ASSET_TYPES.survey.id && this.props.has_deployment && this.props.deployment__active && userCanEdit &&
                <bem.AssetRow__actionIcon
                      m={'archive'}
                      data-action={'archive'}
                      data-asset-type={this.props.kind}
                    >
                  <i className='k-icon-archived' />
                  {t('Archive')}
                </bem.AssetRow__actionIcon>
              }
              { this.props.asset_type && this.props.asset_type === ASSET_TYPES.survey.id && userCanEdit &&
                <bem.AssetRow__actionIcon
                  m={'cloneAsTemplate'}
                  data-action={'cloneAsTemplate'}
                  data-asset-type={this.props.kind}
                  data-asset-name={assetName}
                  data-tip={t('Create template')}
                >
                  <i className='k-icon-template' />
                </bem.AssetRow__actionIcon>
              }
              {userCanEdit &&
                <bem.AssetRow__actionIcon
                  m={'delete'}
                  data-action={'delete'}
                  data-asset-type={this.props.kind}
                  data-asset-name={assetName}
                  data-tip={t('Delete')}
                >
                  <i className='k-icon-trash' />
                </bem.AssetRow__actionIcon>
              }
            </bem.AssetRow__cell>

          </bem.AssetRow__cell>

          { this.state.isTagsInputVisible &&
            <bem.AssetRow__cell m={'tags'}
                key={'tags'}
                className='mdl-cell mdl-cell--12-col'
                >
              <TagInput uid={this.props.uid} tags={this.props.tags} />
            </bem.AssetRow__cell>
          }
        </bem.AssetRow>
      );
  }
};

reactMixin(AssetRow.prototype, mixins.droppable);
reactMixin(AssetRow.prototype, mixins.permissions);
reactMixin(AssetRow.prototype, mixins.contextRouter);

AssetRow.contextTypes = {
  router: PropTypes.object
};

export default AssetRow;
