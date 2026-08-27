{expect} = require('../helper/fauxChai')

# Provide a pass-through translation stub so t() calls in templates resolve
# correctly in the test environment (no Django gettext available here).
window.t ?= (str) -> str

$rowSelectorTemplates = require('../../jsapp/xlform/src/view.rowSelector.templates')
$surveyAppTemplates = require('../../jsapp/xlform/src/view.surveyApp.templates')
$rowTemplates = require('../../jsapp/xlform/src/view.row.templates')

do ->

  ###############################################################
  # view.rowSelector.templates
  ###############################################################
  describe 'view.rowSelector.templates: xlfRowSelector.line(name)', ->

    it 'returns a non-empty string', ->
      html = $rowSelectorTemplates.line('test')
      expect(typeof html).toBe('string')
      expect(html.length > 0).toBe(true)

    it 'wraps content in a row__questiontypes container', ->
      html = $rowSelectorTemplates.line('test')
      expect(html.indexOf('row__questiontypes')).not.toBe(-1)

    it 'injects the provided name as the input value', ->
      html = $rowSelectorTemplates.line('My Survey Question')
      expect(html.indexOf('value="My Survey Question"')).not.toBe(-1)

    it 'renders an empty value attribute when name is empty string', ->
      html = $rowSelectorTemplates.line('')
      expect(html.indexOf('value=""')).not.toBe(-1)

    it 'includes the close button with js-close-row-selector class', ->
      html = $rowSelectorTemplates.line('test')
      expect(html.indexOf('js-close-row-selector')).not.toBe(-1)

    it 'includes the question type list container', ->
      html = $rowSelectorTemplates.line('test')
      expect(html.indexOf('row__questiontypes__list')).not.toBe(-1)

    it 'includes the new question name input class', ->
      html = $rowSelectorTemplates.line('test')
      expect(html.indexOf('row__questiontypes__new-question-name')).not.toBe(-1)

    it 'preserves special characters in the name value', ->
      html = $rowSelectorTemplates.line('Question #1 (required)')
      expect(html.indexOf('value="Question #1 (required)"')).not.toBe(-1)

    it 'different name values produce different HTML', ->
      html1 = $rowSelectorTemplates.line('alpha')
      html2 = $rowSelectorTemplates.line('beta')
      expect(html1).not.toBe(html2)

  describe 'view.rowSelector.templates: xlfRowSelector.cell(atts)', ->

    beforeEach ->
      @sampleAtts =
        id: 'text'
        iconClassName: 'k-icon k-icon-qt-text'
        label: 'Text'

    it 'returns a non-empty string', ->
      html = $rowSelectorTemplates.cell(@sampleAtts)
      expect(typeof html).toBe('string')
      expect(html.length > 0).toBe(true)

    it 'renders the questiontypelist__item container', ->
      html = $rowSelectorTemplates.cell(@sampleAtts)
      expect(html.indexOf('questiontypelist__item')).not.toBe(-1)

    it 'sets data-menu-item to the provided id', ->
      html = $rowSelectorTemplates.cell(@sampleAtts)
      expect(html.indexOf('data-menu-item="text"')).not.toBe(-1)

    it 'renders the icon tag with the provided iconClassName', ->
      html = $rowSelectorTemplates.cell(@sampleAtts)
      expect(html.indexOf('k-icon k-icon-qt-text')).not.toBe(-1)

    it 'renders the label text', ->
      html = $rowSelectorTemplates.cell(@sampleAtts)
      expect(html.indexOf('Text')).not.toBe(-1)

    it 'renders select_one type cell correctly', ->
      atts =
        id: 'select_one'
        iconClassName: 'k-icon k-icon-qt-select-one'
        label: 'Select One'
      html = $rowSelectorTemplates.cell(atts)
      expect(html.indexOf('data-menu-item="select_one"')).not.toBe(-1)
      expect(html.indexOf('k-icon-qt-select-one')).not.toBe(-1)
      expect(html.indexOf('Select One')).not.toBe(-1)

    it 'renders calculate type cell correctly', ->
      atts =
        id: 'calculate'
        iconClassName: 'k-icon k-icon-qt-calculate'
        label: 'Calculate'
      html = $rowSelectorTemplates.cell(atts)
      expect(html.indexOf('data-menu-item="calculate"')).not.toBe(-1)
      expect(html.indexOf('Calculate')).not.toBe(-1)

    it 'different ids produce different data-menu-item values', ->
      html1 = $rowSelectorTemplates.cell({id: 'text', iconClassName: 'x', label: 'Text'})
      html2 = $rowSelectorTemplates.cell({id: 'integer', iconClassName: 'x', label: 'Integer'})
      expect(html1.indexOf('data-menu-item="text"')).not.toBe(-1)
      expect(html2.indexOf('data-menu-item="integer"')).not.toBe(-1)
      expect(html1).not.toBe(html2)

  describe 'view.rowSelector.templates: xlfRowSelector.namer()', ->

    it 'returns a non-empty string', ->
      html = $rowSelectorTemplates.namer()
      expect(typeof html).toBe('string')
      expect(html.length > 0).toBe(true)

    it 'renders the namer variant container class', ->
      html = $rowSelectorTemplates.namer()
      expect(html.indexOf('row__questiontypes--namer')).not.toBe(-1)

    it 'renders the form element with the correct class', ->
      html = $rowSelectorTemplates.namer()
      expect(html.indexOf('row__questiontypes__form')).not.toBe(-1)

    it 'renders the text input with js-cancel-sort class', ->
      html = $rowSelectorTemplates.namer()
      expect(html.indexOf('js-cancel-sort')).not.toBe(-1)

    it 'renders the text input with data-cy="textfield_input"', ->
      html = $rowSelectorTemplates.namer()
      expect(html.indexOf('data-cy="textfield_input"')).not.toBe(-1)

    it 'renders the add question button with data-cy="add_question"', ->
      html = $rowSelectorTemplates.namer()
      expect(html.indexOf('data-cy="add_question"')).not.toBe(-1)

    it 'renders the close button with js-close-row-selector class', ->
      html = $rowSelectorTemplates.namer()
      expect(html.indexOf('js-close-row-selector')).not.toBe(-1)

    it 'renders "Enter question text" as placeholder', ->
      html = $rowSelectorTemplates.namer()
      expect(html.indexOf('Enter question text')).not.toBe(-1)

    it 'renders "Add Question" button text', ->
      html = $rowSelectorTemplates.namer()
      expect(html.indexOf('Add Question')).not.toBe(-1)

    it 'produces identical output on repeated calls (pure function)', ->
      html1 = $rowSelectorTemplates.namer()
      html2 = $rowSelectorTemplates.namer()
      expect(html1).toBe(html2)

  ###############################################################
  # view.surveyApp.templates
  ###############################################################
  describe 'view.surveyApp.templates: surveyApp(opts)', ->

    beforeEach ->
      @emptyOpts =
        survey: {}
        warnings: []
      @render = (opts) -> $surveyAppTemplates.surveyApp(opts)

    it 'returns a non-empty string', ->
      html = @render(@emptyOpts)
      expect(typeof html).toBe('string')
      expect(html.length > 0).toBe(true)

    it 'renders the survey-editor container', ->
      html = @render(@emptyOpts)
      expect(html.indexOf('survey-editor')).not.toBe(-1)

    it 'renders the empty-form message', ->
      html = @render(@emptyOpts)
      expect(html.indexOf('This form is currently empty.')).not.toBe(-1)

    it 'renders the helper hint text for adding questions', ->
      html = @render(@emptyOpts)
      expect(html.indexOf('clicking the Add Item button below')).not.toBe(-1)

    it 'renders the + button with js-expand-row-selector class', ->
      html = @render(@emptyOpts)
      expect(html.indexOf('js-expand-row-selector')).not.toBe(-1)

    it 'renders the + button with data-cy="plus"', ->
      html = @render(@emptyOpts)
      expect(html.indexOf('data-cy="plus"')).not.toBe(-1)

    it 'renders the k-icon-plus icon inside the + button', ->
      html = @render(@emptyOpts)
      expect(html.indexOf('k-icon-plus')).not.toBe(-1)

    it 'renders the add-item control as a real <button> element (native keyboard activation)', ->
      html = @render(@emptyOpts)
      expect(/<button[^>]*class="[^"]*\bbtn--addrow\b[^"]*"[^>]*data-cy="plus"/.test(html)).toBe(true)

    it 'renders the "Add Item" label text for the empty-state control', ->
      html = @render(@emptyOpts)
      expect(html.indexOf('Add Item')).not.toBe(-1)

    it 'renders a dedicated full-width rule element alongside the empty-state control', ->
      html = @render(@emptyOpts)
      expect(html.indexOf('survey__row__spacer-rule')).not.toBe(-1)

    it 'renders the survey-editor__null-top-row for the empty state', ->
      html = @render(@emptyOpts)
      expect(html.indexOf('survey-editor__null-top-row')).not.toBe(-1)

    it 'does not render warning markup when warnings array is empty', ->
      html = @render(@emptyOpts)
      expect(html.indexOf('survey-warnings')).toBe(-1)

    it 'renders a warning block when warnings are present', ->
      opts =
        survey: {}
        warnings: ['Please check your survey.']
      html = @render(opts)
      expect(html.indexOf('survey-warnings')).not.toBe(-1)
      expect(html.indexOf('Please check your survey.')).not.toBe(-1)

    it 'renders a close button for the warnings block', ->
      opts =
        survey: {}
        warnings: ['Warning one.']
      html = @render(opts)
      expect(html.indexOf('js-close-warning')).not.toBe(-1)

    it 'renders each warning message as its own paragraph', ->
      opts =
        survey: {}
        warnings: ['First warning.', 'Second warning.']
      html = @render(opts)
      expect(html.indexOf('First warning.')).not.toBe(-1)
      expect(html.indexOf('Second warning.')).not.toBe(-1)
      # Each warning should have its own survey-warnings__warning element
      count = (html.match(/survey-warnings__warning/g) or []).length
      expect(count).toBe(2)

    it 'renders without warnings when warnings property is undefined', ->
      opts = survey: {}
      html = @render(opts)
      expect(html.indexOf('survey-warnings')).toBe(-1)

  ###############################################################
  # view.row.templates: shared end-of-row add-item spacer
  # (OC-28570: full-width "Add Item" control, replaces the small
  # plus-icon spacer across rows, groups, matrices and error rows)
  ###############################################################
  describe 'view.row.templates: expandingSpacerHtml (shared add-item spacer)', ->

    beforeEach ->
      @surveyView = { features: { multipleQuestions: true }, canAddToLibrary: false }

    it 'renders the add-item control as a real <button> element (native keyboard activation)', ->
      html = $rowTemplates.xlfRowView(@surveyView)
      expect(/<button[^>]*class="[^"]*\bbtn--addrow\b/.test(html)).toBe(true)

    it 'does not render the legacy tabIndex-based div for the add-item control', ->
      html = $rowTemplates.xlfRowView(@surveyView)
      expect(html.indexOf('tabIndex="0" class="js-expand-row-selector')).toBe(-1)

    it 'renders the "Add Item" label text', ->
      html = $rowTemplates.xlfRowView(@surveyView)
      expect(html.indexOf('Add Item')).not.toBe(-1)

    it 'renders a dedicated full-width rule element alongside the control', ->
      html = $rowTemplates.xlfRowView(@surveyView)
      expect(html.indexOf('survey__row__spacer-rule')).not.toBe(-1)

    it 'still renders the functional .line container used by RowSelector to host the namer/picker', ->
      html = $rowTemplates.xlfRowView(@surveyView)
      expect(html.indexOf('class="line"')).not.toBe(-1)

    it 'renders the same add-item spacer for groupView', ->
      html = $rowTemplates.groupView(@surveyView)
      expect(html.indexOf('survey__row__spacer-rule')).not.toBe(-1)
      expect(/<button[^>]*class="[^"]*\bbtn--addrow\b/.test(html)).toBe(true)

    it 'renders the same add-item spacer for koboMatrixView', ->
      html = $rowTemplates.koboMatrixView()
      expect(html.indexOf('survey__row__spacer-rule')).not.toBe(-1)
      expect(/<button[^>]*class="[^"]*\bbtn--addrow\b/.test(html)).toBe(true)

    it 'renders the same add-item spacer for rowErrorView', ->
      html = $rowTemplates.rowErrorView('<Row/>')
      expect(html.indexOf('survey__row__spacer-rule')).not.toBe(-1)
      expect(/<button[^>]*class="[^"]*\bbtn--addrow\b/.test(html)).toBe(true)

  ###############################################################
  # view.row.templates: leadingSpacerHtml (add-item control above
  # the first item in a list/group)
  # (OC-28571 AC4: insertion point above the very first item)
  ###############################################################
  describe 'view.row.templates: leadingSpacerHtml (leading add-item spacer)', ->

    it 'is a non-empty string', ->
      html = $rowTemplates.leadingSpacerHtml
      expect(typeof html).toBe('string')
      expect(html.length > 0).toBe(true)

    it 'renders the add-item control as a real <button> element', ->
      html = $rowTemplates.leadingSpacerHtml
      expect(/<button[^>]*class="[^"]*\bbtn--addrow\b/.test(html)).toBe(true)

    it 'is marked as a leading spacer, distinct from the trailing spacer', ->
      html = $rowTemplates.leadingSpacerHtml
      expect(html.indexOf('survey__row__spacer--leading')).not.toBe(-1)

    it 'reuses the js-expand-row-selector click hook', ->
      html = $rowTemplates.leadingSpacerHtml
      expect(html.indexOf('js-expand-row-selector')).not.toBe(-1)

    it 'renders the "Add Item" label text', ->
      html = $rowTemplates.leadingSpacerHtml
      expect(html.indexOf('Add Item')).not.toBe(-1)

    it 'renders a dedicated full-width rule element alongside the control', ->
      html = $rowTemplates.leadingSpacerHtml
      expect(html.indexOf('survey__row__spacer-rule')).not.toBe(-1)

  ###############################################################
  # view.row.templates: emptyGroupSpacerHtml (add-item control for
  # a Layout Group with no children)
  # (OC-28572 AC4: insertion control inside an empty group's
  # boundary; AC5: distinct accessible name from the "after group"
  # control)
  ###############################################################
  describe 'view.row.templates: emptyGroupSpacerHtml (empty-group add-item spacer)', ->

    it 'is a non-empty string', ->
      html = $rowTemplates.emptyGroupSpacerHtml
      expect(typeof html).toBe('string')
      expect(html.length > 0).toBe(true)

    it 'renders the add-item control as a real <button> element', ->
      html = $rowTemplates.emptyGroupSpacerHtml
      expect(/<button[^>]*class="[^"]*\bbtn--addrow\b/.test(html)).toBe(true)

    it 'is marked as an empty-group spacer', ->
      html = $rowTemplates.emptyGroupSpacerHtml
      expect(html.indexOf('survey__row__spacer--empty-group')).not.toBe(-1)

    it 'reuses the js-expand-row-selector click hook', ->
      html = $rowTemplates.emptyGroupSpacerHtml
      expect(html.indexOf('js-expand-row-selector')).not.toBe(-1)

    it 'renders the "Add Item" visible label text (unchanged from other controls)', ->
      html = $rowTemplates.emptyGroupSpacerHtml
      expect(html.indexOf('Add Item')).not.toBe(-1)

    it 'gives the control a distinct accessible name that says it adds inside the group', ->
      html = $rowTemplates.emptyGroupSpacerHtml
      expect(/aria-label="[^"]*inside[^"]*group[^"]*"/i.test(html)).toBe(true)

    it 'gives the control a matching title tooltip for sighted users', ->
      html = $rowTemplates.emptyGroupSpacerHtml
      expect(/title="[^"]*inside[^"]*group[^"]*"/i.test(html)).toBe(true)
