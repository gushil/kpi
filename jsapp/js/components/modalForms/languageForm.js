import React from 'react'

import autoBind from 'react-autobind'
import bem from '#/bem'
import Button from '#/components/common/button'
import TextBox from '#/components/common/textBox'
import { toTitleCase } from '#/textUtils'
import { getLangAsObject } from '#/utils'

/*
Properties:
- langString <string>: follows pattern "Name (code)"
- langIndex <string>
- onLanguageChange <function>: required
- existingLanguages <langString[]>: for validation purposes
- isDefault <boolean>: for default language only
- isPending <boolean>: marks the submit button as pending
- onDirtyChange <function>: optional, called with a boolean whenever typed
  input differs from what was last submitted/loaded, so a parent can warn
  before discarding it
*/
class LanguageForm extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      name: '',
      nameError: null,
      code: '',
      codeError: null,
    }

    if (this.props.langString) {
      const lang = getLangAsObject(this.props.langString)

      if (lang) {
        this.state = {
          name: lang.name || '',
          code: lang.code || '',
        }
      } else {
        // if language isn't in "English (en)" format, assume it is a simple language name string
        this.state = {
          name: this.props.langString,
          code: '',
        }
      }
    }

    // baseline to diff typed input against, so we only report "dirty" once
    // the user actually changes something
    this.initialName = this.state.name
    this.initialCode = this.state.code

    autoBind(this)
  }

  componentWillUnmount() {
    // form is going away (submitted, cancelled, or modal closing) — whatever
    // was tracked as dirty no longer applies
    if (this.props.onDirtyChange) {
      this.props.onDirtyChange(false)
    }
  }

  reportDirtyState(name, code) {
    if (this.props.onDirtyChange) {
      this.props.onDirtyChange(name !== this.initialName || code !== this.initialCode)
    }
  }

  isLanguageNameValid() {
    if (this.props.existingLanguages) {
      let isNameUnique = true
      this.props.existingLanguages.forEach((langString) => {
        if (this.props.langString && langString === this.props.langString) {
          // skip comparing to itself (editing language context)
        } else if (langString !== null) {
          const langObj = getLangAsObject(langString)
          if (langObj && langObj.name === this.state.name) {
            isNameUnique = false
          }
        }
      })
      return isNameUnique
    } else {
      return true
    }
  }

  isLanguageCodeValid() {
    if (this.props.existingLanguages) {
      let isCodeUnique = true
      this.props.existingLanguages.forEach((langString) => {
        if (this.props.langString && langString === this.props.langString) {
          // skip comparing to itself (editing language context)
        } else if (langString !== null) {
          const langObj = getLangAsObject(langString)
          if (langObj && langObj.code === this.state.code) {
            isCodeUnique = false
          }
        }
      })
      return isCodeUnique
    } else {
      return true
    }
  }

  onSubmit(evt) {
    evt.preventDefault()

    const isNameValid = this.isLanguageNameValid()
    if (isNameValid) {
      this.setState({ nameError: null })
    } else {
      this.setState({ nameError: t('Name must be unique!') })
    }

    const isCodeValid = this.isLanguageCodeValid()
    if (isCodeValid) {
      this.setState({ codeError: null })
    } else {
      this.setState({ codeError: t('Code must be unique!') })
    }

    if (isNameValid && isCodeValid) {
      let langIndex = this.props.isDefault ? 0 : -1
      if (this.props.langIndex !== undefined) {
        langIndex = this.props.langIndex
      }
      this.props.onLanguageChange(
        {
          name: this.state.name,
          code: this.state.code,
        },
        langIndex,
      )

      // submitted values are now the new baseline; nothing unsaved anymore
      this.initialName = this.state.name
      this.initialCode = this.state.code
      this.reportDirtyState(this.state.name, this.state.code)
    }
  }

  onNameChange(newName) {
    const name = toTitleCase(newName.trim().toLowerCase())
    this.setState({
      name: name,
      nameError: null,
    })
    this.reportDirtyState(name, this.state.code)
  }

  onCodeChange(newCode) {
    const code = newCode.trim().toLowerCase()
    this.setState({
      code: code,
      codeError: null,
    })
    this.reportDirtyState(this.state.name, code)
  }

  render() {
    const isAnyFieldEmpty = this.state.name.length === 0 || this.state.code.length === 0
    const hasErrors = this.state.nameError !== null || this.state.codeError !== null

    return (
      <bem.FormView__form m='add-language-fields'>
        <bem.FormView__cell m='lang-name'>
          <bem.FormModal__item>
            <label>{this.props.isDefault ? t('Primary language name') : t('Language name')}</label>
            <TextBox value={this.state.name} onChange={this.onNameChange.bind(this)} errors={this.state.nameError} />
          </bem.FormModal__item>
        </bem.FormView__cell>

        <bem.FormView__cell m='lang-code'>
          <bem.FormModal__item>
            <label>{this.props.isDefault ? t('Primary language code') : t('Language code')}</label>
            <TextBox value={this.state.code} onChange={this.onCodeChange.bind(this)} errors={this.state.codeError} />
          </bem.FormModal__item>
        </bem.FormView__cell>

        <bem.FormView__cell m='submit-button'>
          <Button
            type='primary'
            size='l'
            label={this.props.langIndex !== undefined ? t('Update') : this.props.isDefault ? t('Set') : t('Add')}
            isSubmit
            isPending={this.props.isPending}
            isDisabled={isAnyFieldEmpty}
            onClick={this.onSubmit.bind(this)}
          />
        </bem.FormView__cell>
      </bem.FormView__form>
    )
  }
}

export default LanguageForm
