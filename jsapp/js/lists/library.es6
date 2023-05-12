import React from 'react';
import PropTypes from 'prop-types';
import reactMixin from 'react-mixin';
import autoBind from 'react-autobind';
import Select from 'react-select';
import Reflux from 'reflux';
import { hashHistory } from 'react-router';

import searches from '../searches';
import mixins from '../mixins';
import stores from '../stores';
import bem from '../bem';
import ui from '../ui';
import {dataInterface} from '../dataInterface';
import SearchCollectionList from '../components/searchcollectionlist';
import {
  ListSearchSummary,
} from '../components/list';
import {
  t,
  getLibraryFilterCacheName
} from '../utils';

var libraryManagementSupportUrl = 'https://docs.openclinica.com/oc4/help-index/form-designer/library-management/';
class LibrarySearchableList extends React.Component {
  constructor(props) {
    super(props);

    this.TYPE_FILTER = {
      ALL: 'asset_type:question OR asset_type:block OR asset_type:template',
      BY_QUESTION: 'asset_type:question',
      BY_BLOCK: 'asset_type:block',
      BY_TEMPLATE: 'asset_type:template'
    }
    this.TYPE_FILTER_DEFAULT = this.TYPE_FILTER.ALL;

    this.state = {
      typeFilterVal: this.TYPE_FILTER_DEFAULT,
      searchContext: searches.getSearchContext('library', {
        filterParams: {assetType: this.TYPE_FILTER_DEFAULT},
        filterTags: this.TYPE_FILTER_DEFAULT,
      }),
      isSessionLoaded: !!stores.session.currentAccount,
      showAllTags: false
    };
    autoBind(this);
  }
  queryCollections () {
    dataInterface.listCollections().then((collections)=>{
      this.setState({
        sidebarCollections: collections.results,
      });
    });
  }
  loadFilterTypeSettings() {
    let filterTypeSettings = sessionStorage.getItem(getLibraryFilterCacheName());
    if (filterTypeSettings) {
      filterTypeSettings = JSON.parse(filterTypeSettings);
      this.setState({
        typeFilterVal: filterTypeSettings,
        searchContext: searches.getSearchContext('library', {
          filterParams: {assetType: filterTypeSettings.value},
          filterTags: filterTypeSettings.value,
        })
      });
    }
  }
  saveFilterTypeSettings(filterTypeSettings) {
    sessionStorage.setItem(getLibraryFilterCacheName(), JSON.stringify(filterTypeSettings));
  }
  componentDidMount () {
    this.listenTo(stores.session, ({currentAccount}) => {
      if (currentAccount) {
        if (currentAccount.user_type.toLowerCase() == 'user') {
          hashHistory.push('/access-denied');
        } else {
          this.setState({
            isSessionLoaded: true,
          });
        }
      }
    });
    this.loadFilterTypeSettings();
    this.searchDefault();
    this.queryCollections();
  }
  onTypeFilterChange(evt) {
    this.saveFilterTypeSettings(evt);
    this.setState({
      typeFilterVal: evt,
      searchContext: searches.getSearchContext('library', {
        filterParams: {assetType: evt.value},
        filterTags: evt.value,
      })
    });
    this.searchDefault();
  }
  renderLoading(message = t('loading…')) {
    return (
      <bem.Loading>
        <bem.Loading__inner>
          <i />
          {message}
        </bem.Loading__inner>
      </bem.Loading>
    );
  }
  clickShowAllTagsToggle () {
    this.setState((prevState) => {
      return {
        showAllTags : !prevState.showAllTags
      };
    });
  }
  render () {
    if (!this.state.isSessionLoaded) {
      return this.renderLoading();
    }
    const typeFilterOptions = [
      {value: this.TYPE_FILTER.ALL, label: t('Show All')},
      {value: this.TYPE_FILTER.BY_QUESTION, label: t('Question')},
      {value: this.TYPE_FILTER.BY_BLOCK, label: t('Block')},
      {value: this.TYPE_FILTER.BY_TEMPLATE, label: t('Template')}
    ];
    return (
      <bem.Library>
        <bem.Library__actions
          m={{
            'display-all-tags': this.state.showAllTags,
          }}
        >
          <bem.Library__actionIcon
              m='libraryHelp'
              href={libraryManagementSupportUrl}
              target='_blank'
              data-tip={t('Learn more about Library Management')}
              >
            <i className='k-icon-help'/>
          </bem.Library__actionIcon>
          <bem.Library__actionIcon
              m='tagsToggle'
              onClick={this.clickShowAllTagsToggle}
              data-tip= {this.state.showAllTags ? t('Hide all labels') : t('Show all labels')}
              >
            <i className='k-icon-tag' />
          </bem.Library__actionIcon>
        </bem.Library__actions>
        <bem.Library__typeFilter>
          {t('Filter by type:')}
          &nbsp;
          <Select
            className='kobo-select'
            classNamePrefix='kobo-select'
            value={this.state.typeFilterVal}
            isClearable={false}
            isSearchable={false}
            options={typeFilterOptions}
            onChange={this.onTypeFilterChange}
          />
        </bem.Library__typeFilter>

        <SearchCollectionList
          showDefault
          searchContext={this.state.searchContext}
          showAllTags={this.state.showAllTags}
        />

        <ListSearchSummary
          assetDescriptor={t('library item')}
          assetDescriptorPlural={t('library items')}
          searchContext={this.state.searchContext}
        />
      </bem.Library>
      );
  }
};

LibrarySearchableList.contextTypes = {
  router: PropTypes.object
};

reactMixin(LibrarySearchableList.prototype, searches.common);
reactMixin(LibrarySearchableList.prototype, mixins.droppable);
reactMixin(LibrarySearchableList.prototype, Reflux.ListenerMixin);

export default LibrarySearchableList;
