import $ from 'jquery';
import React from 'react';
import PropTypes from 'prop-types';
import reactMixin from 'react-mixin';
import autoBind from 'react-autobind';
import Reflux from 'reflux';
import { Link } from 'react-router';
import Dropzone from 'react-dropzone';
import alertify from 'alertifyjs';

import permConfig from 'js/components/permissions/permConfig';
import {dataInterface} from '../dataInterface';
import {actions} from '../actions';
import {stores} from '../stores';
import {bem} from '../bem';
import {searches} from '../searches';
import ui from '../ui';
import mixins from '../mixins';

import {MODAL_TYPES, ANON_USERNAME, PERMISSIONS_CODENAMES} from '../constants';

import {
  t,
  assign,
  validFileTypes,
  getAnonymousUserPermission,
  anonUsername,
  getLibraryFilterCacheName,
  buildUserUrl
} from '../utils';


class LibrarySidebar extends Reflux.Component {
  constructor(props){
    super(props);
    this.state = assign({}, stores.pageState.state);
    this.stores = [
      stores.session,
      stores.pageState
    ];

    autoBind(this);
  }
  queryCollections () {
    dataInterface.listCollections().then((collections)=>{
      this.setState({
        sidebarCollections: collections.results.filter((value) => {
          return value.access_type !== 'public';
        }),
        sidebarPublicCollections: collections.results.filter((value) => {
          return value.access_type === 'public' ||
            value.access_type === 'subscribed';
        })
      });
    });
  }
  componentDidMount () {
    this.listenTo(this.searchStore, this.searchChanged);
    this.setStates();
    this.searchDefault();
    this.queryCollections();
  }
  componentWillMount() {
    this.setStates();
  }
  searchChanged (state) {
    this.setState(state);
  }
  setStates() {
    let assetType = 'asset_type:question OR asset_type:block OR asset_type:template';

    let filterTypeSettings = sessionStorage.getItem(getLibraryFilterCacheName());
    if (filterTypeSettings) {
      filterTypeSettings = JSON.parse(filterTypeSettings);
      assetType = filterTypeSettings.value;
    }

    this.setState({
      headerFilters: 'library',
      publicCollectionsVisible: false,
      searchContext: searches.getSearchContext('library', {
        filterParams: {
          assetType: assetType,
        },
        filterTags: assetType,
      })
    });
  }
  clickFilterByCollection (evt) {
    var target = $(evt.target);
    if (target.hasClass('collection-toggle')) {
      return false;
    }
    var data = $(evt.currentTarget).data();
    var collectionUid = false;
    var collectionName = false;
    var publicCollection = false;
    if (data.collectionUid) {
      collectionUid = data.collectionUid;
    }
    if (data.collectionName) {
      collectionName = data.collectionName;
    }
    if (data.publicCollection) {
      publicCollection = true;
    }
    this.quietUpdateStore({
      parentUid: collectionUid,
      parentName: collectionName,
      allPublic: publicCollection
    });
    this.searchValue();
    this.setState({
      filteredCollectionUid: collectionUid,
      filteredByPublicCollection: publicCollection,
    });
  }
  clickShowPublicCollections (evt) {
    this.setState({
      publicCollectionsVisible: !this.state.publicCollectionsVisible,
    });
    //TODO: show the collections in the main pane?
  }
  createCollection () {
    let dialog = alertify.dialog('prompt');
    let opts = {
      title: t('Create collection'),
      message: t('Please enter the name of your new Collection. Collections can help you better organize your library.'),
      labels: {ok: t('Create collection'), cancel: t('Cancel')},
      onok: (evt, val) => {
        dataInterface.createCollection({
          name: val,
        }).then((data)=>{
          this.queryCollections();
          this.searchValue.refresh();
          dialog.destroy();
        });
        // keep the dialog open
        return false;
      },
      oncancel: () => {
        dialog.destroy();
      }
    };
    dialog.set(opts).show();
  }
  deleteCollection (evt) {
    evt.preventDefault();
    var collectionUid = $(evt.currentTarget).data('collection-uid');
    let dialog = alertify.dialog('confirm');
    let opts = {
      title: t('Delete collection'),
      message: t('are you sure you want to delete this collection? this action is not reversible'),
      labels: {ok: t('Delete'), cancel: t('Cancel')},
      onok: (evt, val) => {
        actions.resources.deleteCollection({uid: collectionUid}, {
          onComplete: (data) => {
            this.quietUpdateStore({
              parentUid: false,
              parentName: false,
              allPublic: false
            });
            this.searchValue();
            this.queryCollections();
            dialog.destroy();
          }
        });
      },
      oncancel: () => {
        dialog.destroy();
      }
    };
    dialog.set(opts).show();
  }
  renameCollection (evt) {
    var collectionUid = evt.currentTarget.dataset.collectionUid;
    var collectionName = evt.currentTarget.dataset.collectionName;

    let dialog = alertify.dialog('prompt');
    let opts = {
      title: t('Rename collection'),
      message: t('Please enter the name of your new collection.'),
      value: collectionName,
      labels: {ok: t('Ok'), cancel: t('Cancel')},
      onok: (evt, val) => {
        actions.resources.updateCollection.triggerAsync(collectionUid, {name: val}).then(
          (data) => {
            this.queryCollections();
            dialog.destroy();
          }
        );
        // keep the dialog open
        return false;
      },
      oncancel: () => {
        dialog.destroy();
      }
    };
    dialog.set(opts).show();
  }
  subscribeCollection (evt) {
    evt.preventDefault();
    var collectionUid = $(evt.currentTarget).data('collection-uid');
    dataInterface.subscribeCollection({
      uid: collectionUid,
    }).then(() => {
      this.queryCollections();
    });
  }
  unsubscribeCollection (evt) {
    evt.preventDefault();
    var collectionUid = $(evt.currentTarget).data('collection-uid');
    dataInterface.unsubscribeCollection({
      uid: collectionUid,
    }).then(() => {
      this.queryCollections();
    });
  }
  sharingModal (evt) {
    evt.preventDefault();
    var collectionUid = $(evt.currentTarget).data('collection-uid');
    stores.pageState.showModal({
      type: MODAL_TYPES.SHARING,
      assetid: collectionUid
    });
  }
  isCollectionPublic(collection) {
    return typeof getAnonymousUserPermission(collection.permissions) !== 'undefined';
  }
  /**
   * NOTE: collection discoverability requires to set two things:
   * 1) a permission for anonymous user,
   * 2) `discoverable_when_public` boolean
   * So we need to make two separate calls.
   */
  setCollectionDiscoverability (discoverable, collection) {
    return (evt) => {
      evt.preventDefault();

      // STEP 1: handle `ANON_USERNAME` permission change
      var publicPerm = getAnonymousUserPermission(collection.permissions);
      var permDeferred = false;
      if (discoverable) {
        permDeferred = actions.permissions.assignCollectionPermission(
          collection.uid, {
            user: buildUserUrl(ANON_USERNAME),
            permission: permConfig.getPermissionByCodename(PERMISSIONS_CODENAMES.get('view_collection')).url
          }
        );
      } else if (publicPerm) {
        permDeferred = actions.permissions.removeCollectionPermission(collection.uid, publicPerm.url);
      }

      // STEP 2: handle `discoverable_when_public` change
      let discovDeferred;
      if (permDeferred) {
        discovDeferred = permDeferred.then(() => {
          actions.permissions.setCollectionDiscoverability.triggerAsync(
            collection.uid, discoverable
          );
        }).catch((jqxhr) => {
          // maybe publicPerm was already removed
          if (jqxhr.status !== 404) {
            alertify.error(t('unexpected error removing public permission'));
          }
        });
      } else {
        discovDeferred = actions.permissions.setCollectionDiscoverability.triggerAsync(
          collection.uid, discoverable
        );
      }
      discovDeferred.then(() => {
        window.setTimeout(this.queryCollections, 1);
      });
    };
  }
  render () {
    return (
      <bem.CollectionsWrapper>
        <ui.PopoverMenu
          type='new-menu'
          triggerLabel={t('new')}
        >
          <Link to={'/library/new'} className='popover-menu__link'>
            <i className='k-icon-question' />
            {t('Question')}
          </Link>

          <Link to={'/library/new/template'} className='popover-menu__link'>
            <i className='k-icon-template' />
            {t('Template')}
          </Link>

          <Dropzone
            onDrop={this.dropFiles}
            multiple={false}
            className='dropzone'
            accept={validFileTypes()}
          >
            <bem.PopoverMenu__link>
              <i className='k-icon-upload' />
              {t('upload')}
            </bem.PopoverMenu__link>
          </Dropzone>

          <bem.PopoverMenu__link onClick={this.createCollection}>
            <i className='k-icon-folder' />
            {t('collection')}
          </bem.PopoverMenu__link>
        </ui.PopoverMenu>

        { this.state.sidebarCollections &&
          <bem.FormSidebar>
            <bem.FormSidebar__label
              key='allitems'
              m={{selected: !this.state.publicCollectionsVisible}}
              onClick={this.clickFilterByCollection}>
                  <i className='k-icon-library' />
                  {t('Library')}
              <bem.FormSidebar__labelCount>
                {this.state.defaultQueryCount}
              </bem.FormSidebar__labelCount>

            </bem.FormSidebar__label>
            <bem.FormSidebar__grouping>
              {this.state.sidebarCollections.map((collection)=>{
                var iconClass = 'k-icon-folder';
                if (collection.discoverable_when_public || this.isCollectionPublic(collection))
                  iconClass = 'k-icon-folder-public';
                if (collection.access_type == 'shared')
                  iconClass = 'k-icon-folder-shared';

                return (
                    <bem.FormSidebar__item
                      key={collection.uid}
                      m={{
                        collection: true,
                        selected:
                          this.state.filteredCollectionUid ===
                            collection.uid &&
                          !this.state.filteredByPublicCollection,
                      }}>
                      <bem.FormSidebar__itemlink
                        onClick={this.clickFilterByCollection}
                        data-collection-uid={collection.uid}
                        data-collection-name={collection.name}>
                        <i className={iconClass} />
                        {collection.name}
                      </bem.FormSidebar__itemlink>
                      { !this.state.filteredByPublicCollection && this.state.filteredCollectionUid === collection.uid &&
                        <ui.PopoverMenu type='collectionSidebarPublic-menu'
                            triggerLabel={<i className='k-icon-more' />}>

                          { collection.access_type !== 'subscribed' &&
                            <bem.PopoverMenu__link
                                m={'rename'}
                                onClick={this.renameCollection}
                                data-collection-uid={collection.uid}
                                data-collection-name={collection.name}
                                >
                              <i className='k-icon-edit' />
                              {t('Rename')}
                            </bem.PopoverMenu__link>
                          }
                          { collection.access_type !== 'subscribed' &&
                            <bem.PopoverMenu__link
                                m={'delete'}
                                onClick={this.deleteCollection}
                                data-collection-uid={collection.uid}
                                >
                              <i className='k-icon-trash' />
                              {t('Delete')}
                            </bem.PopoverMenu__link>
                          }
                          { collection.access_type === 'subscribed' &&

                            <bem.PopoverMenu__link
                                m={'unsubscribe'}
                                onClick={this.unsubscribeCollection}
                                data-collection-uid={collection.uid}
                                >
                              <i className='k-icon-trash' />
                              {t('Unsubscribe')}
                            </bem.PopoverMenu__link>
                          }

                        </ui.PopoverMenu>
                      }
                    </bem.FormSidebar__item>
                  );
              })}
            </bem.FormSidebar__grouping>
            <bem.FormSidebar__grouping m={[this.state.publicCollectionsVisible ? 'visible' : 'collapsed']}>
              {this.state.sidebarPublicCollections.map((collection)=>{
                return (
                    <bem.FormSidebar__item
                      key={collection.uid}
                      m={{
                        collection: true,
                        selected:
                          this.state.filteredCollectionUid ===
                            collection.uid &&
                          this.state.filteredByPublicCollection,
                      }}
                    >
                      <bem.FormSidebar__itemlink
                        onClick={this.clickFilterByCollection}
                        data-collection-uid={collection.uid}
                        data-public-collection>
                          <i className='k-icon-folder-public' />
                          <bem.FormSidebar__iteminner>
                            {collection.name}
                            <bem.FormSidebar__itembyline>
                              {t('by ___').replace('___', collection.owner__username)}
                            </bem.FormSidebar__itembyline>
                          </bem.FormSidebar__iteminner>
                      </bem.FormSidebar__itemlink>
                      {this.state.filteredCollectionUid === collection.uid && this.state.filteredByPublicCollection &&
                        <ui.PopoverMenu type='collectionSidebar-menu'
                            triggerLabel={<i className='k-icon-more' />}>
                            { collection.access_type === 'subscribed' ?
                                <bem.PopoverMenu__link href={'#'}
                                  onClick={this.unsubscribeCollection}
                                  data-collection-uid={collection.uid}>
                                  <i className='k-icon-next' />
                                  {t('unsubscribe')}
                                </bem.PopoverMenu__link>
                              :
                                <bem.PopoverMenu__link href={'#'}
                                  onClick={this.subscribeCollection}
                                  data-collection-uid={collection.uid}>
                                  <i className='k-icon-next' />
                                  {t('subscribe')}
                                </bem.PopoverMenu__link>
                            }
                          </ui.PopoverMenu>
                        }
                    </bem.FormSidebar__item>
                  );
              })}
            </bem.FormSidebar__grouping>
          </bem.FormSidebar>
        }
      </bem.CollectionsWrapper>
      );
  }
  componentWillReceiveProps() {
    this.setStates();
  }
}

reactMixin(LibrarySidebar.prototype, searches.common);
reactMixin(LibrarySidebar.prototype, Reflux.ListenerMixin);
reactMixin(LibrarySidebar.prototype, mixins.droppable);

LibrarySidebar.contextTypes = {
  router: PropTypes.object
};

export default LibrarySidebar;
