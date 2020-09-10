import React from 'react';
import PropTypes from 'prop-types';
import reactMixin from 'react-mixin';
import autoBind from 'react-autobind';
import { hashHistory } from 'react-router';
import alertify from 'alertifyjs';
import ui from '../ui';
import {stores} from '../stores';
import Reflux from 'reflux';
import {bem} from '../bem';
import {actions} from '../actions';
import mixins from '../mixins';
import {dataInterface} from '../dataInterface';
import {
  t,
  assign,
  currentLang,
  stringToColor,
} from '../utils';
import {searches} from '../searches';
import {ListSearch} from '../components/list';
import {NAME_MAX_LENGTH} from 'js/constants';

let typingTimer;

class MainHeader extends Reflux.Component {
  constructor(props){
    super(props);
    this.state = assign({
      asset: false,
      currentLang: currentLang(),
      isLanguageSelectorVisible: false,
      libraryFiltersContext: searches.getSearchContext('library', {
        filterParams: {
          assetType: 'asset_type:question OR asset_type:block OR asset_type:template',
        },
        filterTags: 'asset_type:question OR asset_type:block OR asset_type:template',
      }),
      formFiltersContext: searches.getSearchContext('forms', {
        filterParams: {
          assetType: 'asset_type:survey',
        },
        filterTags: 'asset_type:survey',
      })
    }, stores.pageState.state);
    this.stores = [
      stores.session,
      stores.pageState
    ];
    autoBind(this);
  }
  componentDidMount() {
    document.body.classList.add('hide-edge');
    this.listenTo(stores.asset, this.assetLoad);
  }
  componentWillUpdate(newProps) {
    if (this.props.assetid !== newProps.assetid) {
      this.setState({asset: false});
    }
  }
  assetLoad(data) {
    const asset = data[this.props.assetid];
    this.setState(assign({asset: asset}));
  }
  logout () {
    actions.auth.logout();
  }
  toggleLanguageSelector() {
    this.setState({isLanguageSelectorVisible: !this.state.isLanguageSelectorVisible})
  }
  accountSettings () {
    // verifyLogin also refreshes stored profile data
    actions.auth.verifyLogin.triggerAsync().then(() => {
      hashHistory.push('account-settings');
    });
  }
  languageChange (evt) {
    evt.preventDefault();
    let langCode = $(evt.target).data('key');
    if (langCode) {
      // use .always (instead of .done) here since Django 1.8 redirects the request
      dataInterface.setLanguage({language: langCode}).always((r)=>{
        if ('reload' in window.location) {
          window.location.reload();
        } else {
          window.alert(t('Please refresh the page'));
        }
      });
    }
  }
  renderLangItem(lang) {
    return (
      <bem.AccountBox__menuLI key={lang.value}>
        <bem.AccountBox__menuLink onClick={this.languageChange} data-key={lang.value}>
          {lang.label}
        </bem.AccountBox__menuLink>
      </bem.AccountBox__menuLI>
    );
  }
  renderAccountNavMenu () {
    let langs = [];
    if (stores.session.environment) {
      langs = stores.session.environment.interface_languages;
    }
    if (stores.session.currentAccount) {
      var accountName = stores.session.currentAccount.username;
      var accountEmail = stores.session.currentAccount.email;

      var initialsStyle = {background: `#${stringToColor(accountName)}`};
      var accountMenuLabel = <bem.AccountBox__initials style={initialsStyle}>{accountName.charAt(0)}</bem.AccountBox__initials>;

      return (
        <bem.AccountBox>
          {/*<bem.AccountBox__notifications className="is-edge">
            <i className="fa fa-bell"></i>
            <bem.AccountBox__notifications__count> 2 </bem.AccountBox__notifications__count>
          </bem.AccountBox__notifications>*/}
        </bem.AccountBox>
        );
    }

    return (
          <span>{t('n/a')}</span>
    );
  }
  renderGitRevInfo () {
    if (stores.session.currentAccount && stores.session.currentAccount.git_rev) {
      var gitRev = stores.session.currentAccount.git_rev;
      return (
        <bem.GitRev>
          { !!gitRev.branch &&
          <bem.GitRev__item>
            branch: {gitRev.branch}
          </bem.GitRev__item>
          }
          { !!gitRev.short &&
          <bem.GitRev__item>
            commit: {gitRev.short}
          </bem.GitRev__item>
          }
          { !!gitRev.tag &&
          <bem.GitRev__item>
            tag: {gitRev.tag}
          </bem.GitRev__item>
          }
        </bem.GitRev>
      );
    }

    return false;
  }
  toggleFixedDrawer() {
    stores.pageState.toggleFixedDrawer();
  }
  updateAssetTitle() {
    if (!this.state.asset.name.trim()) {
      alertify.error(t('Please enter a title for your project'));
      return false;
    } else {
      actions.resources.updateAsset(
        this.state.asset.uid,
        {
          name: this.state.asset.name,
          settings: JSON.stringify({
            description: this.state.asset.settings.description
          })
        }
      );
      return true;
    }
  }
  assetTitleChange (e) {
    var asset = this.state.asset;
    if (e.target.name == 'title')
      asset.name = e.target.value;
    else
      asset.settings.description = e.target.value;

    this.setState({
      asset: asset
    });

    clearTimeout(typingTimer);
    typingTimer = setTimeout(this.updateAssetTitle.bind(this), 1500);
  }
  assetTitleKeyDown(evt) {
    if (evt.key === 'Enter') {
      clearTimeout(typingTimer);
      if (this.updateAssetTitle()) {
        evt.currentTarget.blur();
      }
    }
  }
  render () {
    var userCanEditAsset = false;
    if (this.state.asset)
      userCanEditAsset = this.userCan('change_asset', this.state.asset);

    const formTitleNameMods = [];
    if (
      this.state.asset &&
      typeof this.state.asset.name === 'string' &&
      this.state.asset.name.length > 125
    ) {
      formTitleNameMods.push('long');
    }

    return (
        <header className='mdl-layout__header'>
          <div className='mdl-layout__header-row'>
            <button className='mdl-button mdl-button--icon' onClick={this.toggleFixedDrawer}>
              <i className='fa fa-bars' />
            </button>
            <span className='mdl-layout-title'>
              <a href='/'>
                <bem.Header__logo />
              </a>
            </span>
            { this.isFormList() &&
              <div className='mdl-layout__header-searchers'>
                <ListSearch searchContext={this.state.formFiltersContext} placeholderText={t('Search Forms')} />
              </div>
            }
            { this.isLibrary() &&
              <div className='mdl-layout__header-searchers'>
                <ListSearch searchContext={this.state.libraryFiltersContext} placeholderText={t('Search Library')} />
              </div>
            }
            { this.isFormSingle() && this.state.asset &&
              <bem.FormTitle>
                { this.state.asset.has_deployment ?
                  <i className='k-icon-deploy' />
                :
                  <i className='k-icon-drafts' />
                }
                <bem.FormTitle__name m={formTitleNameMods}>
                  <input
                    type='text'
                    maxLength={NAME_MAX_LENGTH}
                    name='title'
                    placeholder={t('Project title')}
                    value={this.state.asset.name ? this.state.asset.name : ''}
                    onChange={this.assetTitleChange.bind(this)}
                    onKeyDown={this.assetTitleKeyDown}
                    disabled={!userCanEditAsset}
                  />
                </bem.FormTitle__name>
                { this.state.asset.has_deployment &&
                  <bem.FormTitle__submissions>
                    {this.state.asset.deployment__submission_count} {t('submissions')}
                  </bem.FormTitle__submissions>
                }
              </bem.FormTitle>
            }
            {this.renderAccountNavMenu()}
          </div>
          {this.renderGitRevInfo()}
        </header>
      );
  }
  componentWillReceiveProps(nextProps) {
    if (this.props.assetid != nextProps.assetid && nextProps.assetid != null)
      actions.resources.loadAsset({id: nextProps.assetid});
  }
};

reactMixin(MainHeader.prototype, Reflux.ListenerMixin);
reactMixin(MainHeader.prototype, mixins.contextRouter);
reactMixin(MainHeader.prototype, mixins.permissions);

MainHeader.contextTypes = {
  router: PropTypes.object
};

export default MainHeader;
