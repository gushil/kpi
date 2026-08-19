{expect} = require('../helper/fauxChai')
$ = require('jquery')
Backbone = require('backbone')

# Provide translation stub (no Django runtime in tests)
window.t ?= (str) -> str

$configs = require('../../jsapp/xlform/src/model.configs')

do ->
  ###############################################################
  # view.rowDetail.Templates — the raw HTML builders
  ###############################################################
  describe 'view.rowDetail.Templates: textbox()', ->
    beforeEach ->
      # Lazily require inside test scope so window.t is available
      @Templates = require('../../jsapp/xlform/src/view.rowDetail').Templates

    it 'renders an input[type=text] element', ->
      html = @Templates.textbox('cid1', 'name', 'Item Name', 'text', 'Enter variable name', '40')
      expect(html.indexOf('<input')).not.toBe(-1)
      expect(html.indexOf('type="text"')).not.toBe(-1)

    it 'renders the field label', ->
      html = @Templates.textbox('cid1', 'name', 'Item Name')
      expect(html.indexOf('Item Name')).not.toBe(-1)

    it 'renders the placeholder text when provided', ->
      html = @Templates.textbox('cid1', 'name', 'Item Name', 'text', 'Enter variable name')
      expect(html.indexOf('placeholder="Enter variable name"')).not.toBe(-1)

    it 'renders maxlength attribute when provided', ->
      html = @Templates.textbox('cid1', 'name', 'Item Name', 'text', 'Enter variable name', '40')
      expect(html.indexOf('maxlength="40"')).not.toBe(-1)

    it 'does not render maxlength when not provided', ->
      html = @Templates.textbox('cid1', 'name', 'Item Name', 'text', 'Enter variable name', '')
      expect(html.indexOf('maxlength')).toBe(-1)

    it 'renders the id attribute using the provided cid', ->
      html = @Templates.textbox('my_cid', 'name', 'Item Name')
      expect(html.indexOf('id="my_cid"')).not.toBe(-1)

    it 'renders the name attribute', ->
      html = @Templates.textbox('cid1', 'myfield', 'My Field')
      expect(html.indexOf('name="myfield"')).not.toBe(-1)

    it 'wraps the whole thing in a .card__settings__fields__field div', ->
      html = @Templates.textbox('cid1', 'name', 'Item Name')
      expect(html.indexOf('card__settings__fields__field')).not.toBe(-1)

  describe 'view.rowDetail.Templates: textarea()', ->
    beforeEach ->
      @Templates = require('../../jsapp/xlform/src/view.rowDetail').Templates

    it 'renders a <textarea> element', ->
      html = @Templates.textarea('cid2', 'calculation', 'Calculation', 'text')
      expect(html.indexOf('<textarea')).not.toBe(-1)

    it 'renders the field label', ->
      html = @Templates.textarea('cid2', 'calculation', 'Calculation')
      expect(html.indexOf('Calculation')).not.toBe(-1)

    it 'renders the id attribute', ->
      html = @Templates.textarea('cid_calc', 'calculation', 'Calculation')
      expect(html.indexOf('id="cid_calc"')).not.toBe(-1)

    it 'renders maxlength when provided', ->
      html = @Templates.textarea('cid2', 'desc', 'Item Description', 'text', '', '3999')
      expect(html.indexOf('maxlength="3999"')).not.toBe(-1)

    it 'does not render maxlength when not provided', ->
      html = @Templates.textarea('cid2', 'calculation', 'Calculation', 'text', '', '')
      expect(html.indexOf('maxlength')).toBe(-1)

  describe 'view.rowDetail.Templates: checkbox()', ->
    beforeEach ->
      @Templates = require('../../jsapp/xlform/src/view.rowDetail').Templates

    it 'renders an input[type=checkbox]', ->
      html = @Templates.checkbox('cid3', 'readonly', 'Read only')
      expect(html.indexOf('type="checkbox"')).not.toBe(-1)

    it 'renders the field label "Read only"', ->
      html = @Templates.checkbox('cid3', 'readonly', 'Read only')
      expect(html.indexOf('Read only')).not.toBe(-1)

    it 'renders the input label "Yes" by default', ->
      html = @Templates.checkbox('cid3', 'readonly', 'Read only')
      expect(html.indexOf('Yes')).not.toBe(-1)

    it 'renders a custom input label when provided', ->
      html = @Templates.checkbox('cid3', '_isRepeat', 'Repeat', 'Repeat this group if necessary')
      expect(html.indexOf('Repeat this group if necessary')).not.toBe(-1)

  describe 'view.rowDetail.Templates: radioButton()', ->
    beforeEach ->
      @Templates = require('../../jsapp/xlform/src/view.rowDetail').Templates
      @requiredOptions = [
        {label: 'Always', value: 'yes'},
        {label: 'Never', value: ''},
        {label: 'Conditional', value: 'conditional'}
      ]

    it 'renders input[type=radio] for each option', ->
      html = @Templates.radioButton('cid4', 'required', @requiredOptions, 'Required')
      count = (html.match(/type="radio"/g) or []).length
      expect(count).toBe(3)

    it 'renders the "Always" label', ->
      html = @Templates.radioButton('cid4', 'required', @requiredOptions, 'Required')
      expect(html.indexOf('Always')).not.toBe(-1)

    it 'renders the "Never" label', ->
      html = @Templates.radioButton('cid4', 'required', @requiredOptions, 'Required')
      expect(html.indexOf('Never')).not.toBe(-1)

    it 'renders the "Conditional" label', ->
      html = @Templates.radioButton('cid4', 'required', @requiredOptions, 'Required')
      expect(html.indexOf('Conditional')).not.toBe(-1)

    it 'renders the "Required" field label', ->
      html = @Templates.radioButton('cid4', 'required', @requiredOptions, 'Required')
      expect(html.indexOf('Required')).not.toBe(-1)

    it 'renders value="yes" for the Always option', ->
      html = @Templates.radioButton('cid4', 'required', @requiredOptions, 'Required')
      expect(html.indexOf('value="yes"')).not.toBe(-1)

  describe 'view.rowDetail.Templates: dropdown()', ->
    beforeEach ->
      @Templates = require('../../jsapp/xlform/src/view.rowDetail').Templates
      @externalOptions = ['No', 'clinicaldata', 'contactdata', 'identifier']

    it 'renders a <select> element', ->
      html = @Templates.dropdown('cid5', 'bind::oc:external', @externalOptions, 'Use External Value')
      expect(html.indexOf('<select')).not.toBe(-1)

    it 'renders the field label', ->
      html = @Templates.dropdown('cid5', 'bind::oc:external', @externalOptions, 'Use External Value')
      expect(html.indexOf('Use External Value')).not.toBe(-1)

    it 'renders one <option> per item', ->
      html = @Templates.dropdown('cid5', 'bind::oc:external', @externalOptions, 'Use External Value')
      count = (html.match(/<option/g) or []).length
      expect(count).toBe(@externalOptions.length)

    it 'renders "No" as the first option', ->
      html = @Templates.dropdown('cid5', 'bind::oc:external', @externalOptions, 'Use External Value')
      firstOption = html.indexOf('No')
      expect(firstOption).not.toBe(-1)

    it 'renders object options with value and text correctly', ->
      triggerOptions = [
        {value: '', text: 'No Trigger'},
        {value: '${q1}', text: 'Q1 (${q1})'}
      ]
      html = @Templates.dropdown('cid6', 'trigger', triggerOptions, 'Calculation trigger')
      expect(html.indexOf('No Trigger')).not.toBe(-1)
      expect(html.indexOf('value="${q1}"')).not.toBe(-1)

    it 'renders appearance dropdown for select type with "select" placeholder', ->
      appearances = ['select', 'minimal', 'columns', 'other']
      html = @Templates.dropdown('cid7', 'appearance', appearances, 'Appearance')
      expect(html.indexOf('Appearance')).not.toBe(-1)
      count = (html.match(/<option/g) or []).length
      expect(count).toBe(appearances.length)

  describe 'view.rowDetail.Templates: field()', ->
    beforeEach ->
      @Templates = require('../../jsapp/xlform/src/view.rowDetail').Templates

    it 'wraps content in .card__settings__fields__field', ->
      html = @Templates.field('<input type="text"/>', 'cid1', 'My Label')
      expect(html.indexOf('card__settings__fields__field')).not.toBe(-1)

    it 'inserts the provided input HTML', ->
      html = @Templates.field('<input type="text" class="myInput"/>', 'cid1', 'My Label')
      expect(html.indexOf('class="myInput"')).not.toBe(-1)

    it 'renders a label pointing to the cid', ->
      html = @Templates.field('<input/>', 'label_cid', 'Field Label')
      expect(html.indexOf('for="label_cid"')).not.toBe(-1)
      expect(html.indexOf('Field Label')).not.toBe(-1)

  ###############################################################
  # view.rowDetail: DetailViewMixins — html() rendering per field
  # These tests load the actual Mixins and call html() directly
  # after supplying minimal model/survey stubs.
  ###############################################################
  describe 'view.rowDetail.DetailViewMixins: "name" html()', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      @survey = new $model.Survey()
      @survey.rows.add(type: 'text', name: 'sample_q', label: 'Sample')
      @row = @survey.rows.at(0)
      @detail = @row.get('name')
      @mixin = @viewRowDetail.DetailViewMixins.name
      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'test_cid'
        $el: $('<div/>')
        model: @detail
        Templates: @viewRowDetail.Templates
      })
    afterEach ->
      window.xlfHideWarnings = false

    it 'name field sets fieldTab to "active"', ->
      @mixin_ctx.html()
      expect(@mixin_ctx.fieldTab).toBe('active')

    it 'name field html contains "Item Name" label', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Item Name')).not.toBe(-1)

    it 'name field html contains an input[type=text]', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('type="text"')).not.toBe(-1)

    it 'name field html contains the maxlength attribute', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('maxlength')).not.toBe(-1)

  describe 'view.rowDetail.DetailViewMixins: "readonly" html()', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      @detail = survey.rows.at(0).get('readonly')
      @mixin = @viewRowDetail.DetailViewMixins.readonly
      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'cid_ro'
        $el: $('<div/>')
        model: @detail
        Templates: @viewRowDetail.Templates
      })
    afterEach ->
      window.xlfHideWarnings = false

    it 'readonly html() renders a checkbox', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('type="checkbox"')).not.toBe(-1)

    it 'readonly html() renders "Read only" label', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Read only')).not.toBe(-1)

    it 'readonly html() sets fieldTab to "active"', ->
      @mixin_ctx.html()
      expect(@mixin_ctx.fieldTab).toBe('active')

  describe 'view.rowDetail.DetailViewMixins: "required" html()', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      @detail = survey.rows.at(0).get('required')
      @mixin = @viewRowDetail.DetailViewMixins.required
      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'cid_req'
        $el: $('<div/>')
        model: @detail
        Templates: @viewRowDetail.Templates
      })
    afterEach ->
      window.xlfHideWarnings = false

    it 'required html() renders radio buttons', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('type="radio"')).not.toBe(-1)

    it 'required html() includes "Always" option', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Always')).not.toBe(-1)

    it 'required html() includes "Never" option', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Never')).not.toBe(-1)

    it 'required html() includes "Conditional" option', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Conditional')).not.toBe(-1)

    it 'required html() renders "Required" as the field label', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Required')).not.toBe(-1)

    it 'getOptions() returns 3 options', ->
      opts = @mixin_ctx.getOptions()
      expect(opts.length).toBe(3)

    it 'getOptions() has an option with value "yes" for Always', ->
      opts = @mixin_ctx.getOptions()
      found = opts.find (o) -> o.value is 'yes'
      expect(found).toBeDefined()
      expect(found.label).toBe('Always')

    it 'getOptions() has an option with value "" for Never', ->
      opts = @mixin_ctx.getOptions()
      found = opts.find (o) -> o.value is ''
      expect(found).toBeDefined()
      expect(found.label).toBe('Never')

    it 'getOptions() has a Conditional option', ->
      opts = @mixin_ctx.getOptions()
      found = opts.find (o) -> o.label is 'Conditional'
      expect(found).toBeDefined()

  describe 'view.rowDetail.DetailViewMixins: "calculation" html()', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'calculate', name: 'calc_q', label: 'Calc')
      @detail = survey.rows.at(0).get('calculation')
      @mixin = @viewRowDetail.DetailViewMixins.calculation
      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'cid_calc'
        $el: $('<div/>')
        model: @detail
        Templates: @viewRowDetail.Templates
      })
    afterEach ->
      window.xlfHideWarnings = false

    it 'calculation html() renders a textarea', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('<textarea')).not.toBe(-1)

    it 'calculation html() renders "Calculation" label', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Calculation')).not.toBe(-1)

    it 'calculation html() sets fieldTab to "active"', ->
      @mixin_ctx.html()
      expect(@mixin_ctx.fieldTab).toBe('active')

  describe 'view.rowDetail.DetailViewMixins: "oc_item_group" html()', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      @detail = survey.rows.at(0).get('bind::oc:itemgroup')
      @mixin = @viewRowDetail.DetailViewMixins.oc_item_group
      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'cid_grp'
        $el: $('<div/>')
        model: @detail
        Templates: @viewRowDetail.Templates
      })
    afterEach ->
      window.xlfHideWarnings = false

    it 'oc_item_group html() renders an input[type=text]', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('type="text"')).not.toBe(-1)

    it 'oc_item_group html() renders "Item Group" label', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Item Group')).not.toBe(-1)

    it 'oc_item_group html() renders placeholder "Enter data set name"', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Enter data set name')).not.toBe(-1)

    it 'oc_item_group html() sets fieldTab to "active"', ->
      @mixin_ctx.html()
      expect(@mixin_ctx.fieldTab).toBe('active')

    it 'oc_item_group insertInDOM() places field in the primary right column, not the advanced panel', ->
      viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $primaryRight = $('<div class="js-card-settings-col-right"/>')
      $advanced = $('<div class="js-card-settings-row-options-advanced"/>')
      $default = $('<div class="default-parent"/>')
      mockRowView =
        primaryRowDetailParentRight: $primaryRight
        advancedRowDetailParent: $advanced
        defaultRowDetailParent: $default
      mockInstance =
        modelKey: 'oc_item_group'
        $el: $('<div/>')
        _insertInDOM: (target) -> target.append(@$el)
      viewRowDetail.DetailView.prototype.insertInDOM.call(mockInstance, mockRowView)
      expect($primaryRight.children().length).toBe(1)
      expect($advanced.children().length).toBe(0)

  describe 'view.rowDetail.DetailViewMixins: "oc_briefdescription" html()', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      @detail = survey.rows.at(0).get('bind::oc:briefdescription')
      @mixin = @viewRowDetail.DetailViewMixins.oc_briefdescription
      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'cid_brief'
        $el: $('<div/>')
        model: @detail
        Templates: @viewRowDetail.Templates
      })
    afterEach ->
      window.xlfHideWarnings = false

    it 'oc_briefdescription html() renders an input[type=text]', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('type="text"')).not.toBe(-1)

    it 'oc_briefdescription html() renders "Short Display Name" label', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Short Display Name')).not.toBe(-1)

    it 'oc_briefdescription html() renders the correct placeholder', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('column header')).not.toBe(-1)

    it 'oc_briefdescription html() renders maxlength="40"', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('maxlength="40"')).not.toBe(-1)

  describe 'view.rowDetail.DetailViewMixins: "oc_description" html()', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      @detail = survey.rows.at(0).get('bind::oc:description')
      @mixin = @viewRowDetail.DetailViewMixins.oc_description
      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'cid_desc'
        $el: $('<div/>')
        model: @detail
        Templates: @viewRowDetail.Templates
      })
    afterEach ->
      window.xlfHideWarnings = false

    it 'oc_description html() renders an input[type=text]', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('type="text"')).not.toBe(-1)

    it 'oc_description html() renders "Item Description" label', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Item Description')).not.toBe(-1)

    it 'oc_description html() renders the correct placeholder', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Optional item definition')).not.toBe(-1)

    it 'oc_description html() renders maxlength="3999"', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('maxlength="3999"')).not.toBe(-1)

  ###############################################################
  # PII (Encrypted) — oc_briefdescription and oc_description should be
  # hidden and cleared when bind::oc:external is 'contactdata'
  ###############################################################

  describe 'view.rowDetail.DetailViewMixins: PII — oc_briefdescription onOcCustomEvent', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      @survey = new $model.Survey()
      @survey.rows.add(type: 'text', name: 'pii_q', label: 'Patient Name')
      @row = @survey.rows.at(0)
      @detail = @row.get('bind::oc:briefdescription')
      @$el = $('<div><input type="text" value="test value" /></div>')
      @mixin = @viewRowDetail.DetailViewMixins.oc_briefdescription
      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'cid_brief_pii'
        $el: @$el
        $: (sel) => @$el.find(sel)
        model: @detail
        Templates: @viewRowDetail.Templates
      })
    afterEach ->
      window.xlfHideWarnings = false

    it 'onOcCustomEvent with "contactdata" hides the field', ->
      externalDetail = @row.get('bind::oc:external')
      @mixin_ctx.onOcCustomEvent({
        sender: externalDetail
        value: 'contactdata'
      })
      expect(@$el.hasClass('hidden')).toBe(true)

    it 'onOcCustomEvent with "contactdata" clears the value', ->
      @detail.set('value', 'some value')
      externalDetail = @row.get('bind::oc:external')
      @mixin_ctx.onOcCustomEvent({
        sender: externalDetail
        value: 'contactdata'
      })
      expect(@detail.get('value')).toBe('')

    it 'onOcCustomEvent with non-contactdata value shows the field', ->
      @$el.addClass('hidden')
      externalDetail = @row.get('bind::oc:external')
      @mixin_ctx.onOcCustomEvent({
        sender: externalDetail
        value: 'identifier'
      })
      expect(@$el.hasClass('hidden')).toBe(false)

  describe 'view.rowDetail.DetailViewMixins: PII — oc_description onOcCustomEvent', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      @survey = new $model.Survey()
      @survey.rows.add(type: 'text', name: 'pii_q', label: 'Patient Name')
      @row = @survey.rows.at(0)
      @detail = @row.get('bind::oc:description')
      @$el = $('<div><input type="text" value="test value" /></div>')
      @mixin = @viewRowDetail.DetailViewMixins.oc_description
      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'cid_desc_pii'
        $el: @$el
        $: (sel) => @$el.find(sel)
        model: @detail
        Templates: @viewRowDetail.Templates
      })
    afterEach ->
      window.xlfHideWarnings = false

    it 'onOcCustomEvent with "contactdata" hides the field', ->
      externalDetail = @row.get('bind::oc:external')
      @mixin_ctx.onOcCustomEvent({
        sender: externalDetail
        value: 'contactdata'
      })
      expect(@$el.hasClass('hidden')).toBe(true)

    it 'onOcCustomEvent with "contactdata" clears the value', ->
      @detail.set('value', 'some description')
      externalDetail = @row.get('bind::oc:external')
      @mixin_ctx.onOcCustomEvent({
        sender: externalDetail
        value: 'contactdata'
      })
      expect(@detail.get('value')).toBe('')

    it 'onOcCustomEvent with non-contactdata value shows the field', ->
      @$el.addClass('hidden')
      externalDetail = @row.get('bind::oc:external')
      @mixin_ctx.onOcCustomEvent({
        sender: externalDetail
        value: 'identifier'
      })
      expect(@$el.hasClass('hidden')).toBe(false)

  describe 'view.rowDetail.DetailViewMixins: "default" (default value) html()', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      @detail = survey.rows.at(0).get('default')
      @mixin = @viewRowDetail.DetailViewMixins.default
      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'cid_def'
        $el: $('<div/>')
        model: @detail
        Templates: @viewRowDetail.Templates
      })
    afterEach ->
      window.xlfHideWarnings = false

    it 'default html() renders a textarea', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('<textarea')).not.toBe(-1)

    it 'default html() renders "Default value" label', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Default value')).not.toBe(-1)

    it 'default html() sets fieldTab to "active"', ->
      @mixin_ctx.html()
      expect(@mixin_ctx.fieldTab).toBe('active')

  ###############################################################
  # PII (Encrypted) question type — view.rowDetail and icon behaviour
  #
  # The "pii_encrypted" type is a UI shortcut that creates a text
  # question with bind::oc:external = "contactdata".  The type
  # DetailViewMixin is responsible for rendering the lock icon
  # (k-icon-lock) and the "PII (Encrypted)" tooltip whenever
  # bind::oc:external equals "contactdata".
  ###############################################################

  describe 'view.rowDetail: PII (Encrypted) — type mixin icon label', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      @survey = new $model.Survey()
      # Create a text question with bind::oc:external = contactdata (PII row)
      @survey.rows.add(type: 'text', name: 'pii_q', label: 'Patient Name')
      @row = @survey.rows.at(0)
      @row.get('bind::oc:external').set('value', 'contactdata')
    afterEach ->
      window.xlfHideWarnings = false

    it 'bind::oc:external value is "contactdata" for the PII row', ->
      expect(@row.getValue('bind::oc:external')).toBe('contactdata')

    it 'row type is "text" (pii_encrypted is not stored as a type)', ->
      expect(@row.toJSON().type).toBe('text')

    it 'bind::oc:itemgroup defaults to empty string on a new PII row', ->
      expect(@row.getValue('bind::oc:itemgroup')).toBe('')

    it 'bind::oc:external change event fires on the row detail', ->
      # beforeEach already set the value to 'contactdata'; use a different
      # value so Backbone actually fires the change:value event
      fired = false
      @row.get('bind::oc:external').on 'change:value', -> fired = true
      @row.get('bind::oc:external').set('value', 'identifier')
      expect(fired).toBe(true)

  describe 'view.rowDetail: PII — type mixin onOcCustomEvent updates icon to lock', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      @Backbone = require('backbone')
      @survey = new $model.Survey()
      @survey.rows.add(type: 'text', name: 'pii_q', label: 'Patient Name')
      @row = @survey.rows.at(0)

      # Build a minimal DOM structure for the rowView stub
      @$cardEl = $('<div class="survey__row__item">' +
        '<span class="card__header-icon k-icon k-icon-text"></span>' +
        '<span class="card__indicator__icon"></span>' +
        '</div>')

      # Minimal rowView stub
      @rowView =
        $el: @$cardEl
        model: @row

      # Retrieve the type detail model and build a mixin context
      @typeMixin = @viewRowDetail.DetailViewMixins.type
      @mixin_ctx = $.extend({}, @typeMixin, {
        model: @row.get('type')
        rowView: @rowView
      })
    afterEach ->
      window.xlfHideWarnings = false

    it 'onOcCustomEvent with "contactdata" adds "k-icon-lock" to header icon', ->
      externalDetail = @row.get('bind::oc:external')
      @mixin_ctx.onOcCustomEvent({
        sender: externalDetail
        value: 'contactdata'
      })
      expect(@$cardEl.find('.card__header-icon').hasClass('k-icon-lock')).toBe(true)

    it 'onOcCustomEvent with "contactdata" sets data-tip to "PII (Encrypted)"', ->
      externalDetail = @row.get('bind::oc:external')
      @mixin_ctx.onOcCustomEvent({
        sender: externalDetail
        value: 'contactdata'
      })
      expect(@$cardEl.find('.card__indicator__icon').attr('data-tip')).toBe('PII (Encrypted)')

    it 'onOcCustomEvent with non-contactdata value removes "k-icon-lock"', ->
      # First set to contactdata so the lock class is present
      externalDetail = @row.get('bind::oc:external')
      @$cardEl.find('.card__header-icon').addClass('k-icon-lock')
      @mixin_ctx.onOcCustomEvent({
        sender: externalDetail
        value: 'identifier'
      })
      expect(@$cardEl.find('.card__header-icon').hasClass('k-icon-lock')).toBe(false)

    it 'onOcCustomEvent for a different question does not change the icon', ->
      # A sender that belongs to a different row must not update this mixin_ctx
      $model = require('../../jsapp/xlform/src/_model')
      survey2 = new $model.Survey()
      survey2.rows.add(type: 'text', name: 'other_q', label: 'Other')
      otherRow = survey2.rows.at(0)
      otherExternal = otherRow.get('bind::oc:external')

      @mixin_ctx.onOcCustomEvent({
        sender: otherExternal
        value: 'contactdata'
      })
      # Icon should remain unchanged because cid does not match
      expect(@$cardEl.find('.card__header-icon').hasClass('k-icon-lock')).toBe(false)

  describe 'view.rowDetail: PII — oc_external mixin getOptions() for text type', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'pii_q', label: 'Patient Name')
      @row = survey.rows.at(0)
      @detail = @row.get('bind::oc:external')
      @mixin = @viewRowDetail.DetailViewMixins.oc_external
      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'cid_ext'
        $el: $('<div/>')
        model: @detail
        rowView: {model: @row}
      })
    afterEach ->
      window.xlfHideWarnings = false

    it 'getOptions() for text type returns ["contactdata", "identifier"]', ->
      opts = @mixin_ctx.getOptions()
      expect(opts).toBeDefined()
      expect(opts.indexOf('contactdata')).not.toBe(-1)
      expect(opts.indexOf('identifier')).not.toBe(-1)

    it 'getOptions() for text type does not include "clinicaldata"', ->
      opts = @mixin_ctx.getOptions()
      expect(opts.indexOf('clinicaldata')).toBe(-1)

    it 'getOptions() for text type does not include "signature"', ->
      opts = @mixin_ctx.getOptions()
      expect(opts.indexOf('signature')).toBe(-1)

    it 'html() for text type renders a <select> dropdown', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('<select')).not.toBe(-1)

    it 'html() for text type renders "contactdata" as an option', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('contactdata')).not.toBe(-1)

    it 'html() for text type renders "Use External Value" as the field label', ->
      result = @mixin_ctx.html()
      expect(result.indexOf('Use External Value')).not.toBe(-1)

  describe 'view.rowDetail: PII — JSON export with contactdata', ->
    beforeEach ->
      window.xlfHideWarnings = true
    afterEach ->
      window.xlfHideWarnings = false

    it 'exports bind::oc:external as "contactdata" in survey JSON', ->
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'pii_q', label: 'Patient Name')
      survey.rows.at(0).get('bind::oc:external').set('value', 'contactdata')
      result = survey.toJSON()
      row = result.survey[0]
      expect(row['bind::oc:external']).toBe('contactdata')

    it 'type remains "text" in JSON export for a PII row', ->
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'pii_q', label: 'Patient Name')
      survey.rows.at(0).get('bind::oc:external').set('value', 'contactdata')
      result = survey.toJSON()
      row = result.survey[0]
      expect(row['type']).toBe('text')

    it 'changing bind::oc:external from contactdata to "" clears PII status', ->
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'pii_q', label: 'Patient Name')
      detail = survey.rows.at(0).get('bind::oc:external')
      detail.set('value', 'contactdata')
      detail.set('value', '')
      result = survey.toJSON()
      row = result.survey.find((r) -> r.name is 'pii_q')
      expect(row['bind::oc:external']).toBeUndefined()

  describe 'view.rowDetail: PII — fulldob type switching via Contact Data Type dropdown', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')

      @survey = new $model.Survey()
      @survey.rows.add(
        type: 'text'
        name: 'pii_dob'
        label: 'Date of Birth'
        'bind::oc:external': 'contactdata'
        'instance::oc:contactdata': 'firstname'
      )
      @row = @survey.rows.at(0)
      @detail = @row.get('bind::oc:external')
      @mixin = @viewRowDetail.DetailViewMixins.oc_external

      # Create DOM element with contact-data-type select rendered by html()
      htmlResult = @mixin.html.call({
        fieldTab: 'active'
        $el: { addClass: -> }
        model: @detail
        cid: 'cid_dob'
      })
      @$el = $('<div/>').html(htmlResult)

      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'cid_dob'
        $el: @$el
        $: (selector) => @$el.find(selector)
        model: @detail
        rowView: { model: @row }
        contact_data_type_options: [
          {value: 'firstname', label: 'firstname'}
          {value: 'fulldob', label: 'fulldob'}
        ]
      })

    afterEach ->
      window.xlfHideWarnings = false

    it 'selecting "fulldob" changes row type from text to date', ->
      expect(@row.getValue('type')).toBe('text')
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $contactDataSelect = @$el.find('select.contact-data-type')
      $contactDataSelect.val('fulldob').trigger('change')
      expect(@row.getValue('type')).toBe('date')

    it 'selecting another type after fulldob changes row type back to text', ->
      @row.get('type').set('value', 'date')
      expect(@row.getValue('type')).toBe('date')
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $contactDataSelect = @$el.find('select.contact-data-type')
      $contactDataSelect.val('firstname').trigger('change')
      expect(@row.getValue('type')).toBe('text')

  describe 'view.rowDetail: PII — Contact Data Type dropdown placeholder behavior', ->
    beforeEach ->
      window.xlfHideWarnings = true
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')

      @survey = new $model.Survey()
      @survey.rows.add(
        type: 'text'
        name: 'pii_new'
        label: 'New PII Item'
        'bind::oc:external': 'contactdata'
        'instance::oc:contactdata': ''  # Empty value means placeholder should be shown
      )
      @row = @survey.rows.at(0)
      @detail = @row.get('bind::oc:external')
      @mixin = @viewRowDetail.DetailViewMixins.oc_external

      # Create DOM element with contact-data-type select rendered by html()
      htmlResult = @mixin.html.call({
        fieldTab: 'active'
        $el: { addClass: -> }
        model: @detail
        cid: 'cid_new'
      })
      @$el = $('<div/>').html(htmlResult)

      @mixin_ctx = $.extend({}, @mixin, {
        cid: 'cid_new'
        $el: @$el
        $: (selector) => @$el.find(selector)
        model: @detail
        rowView: { model: @row }
        contact_data_type_placeholder: {value: 'select', label: 'Select'}
        contact_data_type_options: [
          {value: 'firstname', label: 'firstname'}
          {value: 'lastname', label: 'lastname'}
          {value: 'fulldob', label: 'fulldob'}
        ]
      })

    afterEach ->
      window.xlfHideWarnings = false

    it 'shows "Select" placeholder when instance::oc:contactdata is empty', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $contactDataSelect = @$el.find('select.contact-data-type')
      expect($contactDataSelect.val()).toBe('select')

    it 'applies is-placeholder class when value is "select"', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $contactDataSelect = @$el.find('select.contact-data-type')
      expect($contactDataSelect.hasClass('is-placeholder')).toBe(true)

    it 'removes is-placeholder class when a value is selected', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $contactDataSelect = @$el.find('select.contact-data-type')
      $contactDataSelect.val('firstname').trigger('change')
      expect($contactDataSelect.hasClass('is-placeholder')).toBe(false)

    it 'sets instance::oc:contactdata to empty string when placeholder is selected', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $contactDataSelect = @$el.find('select.contact-data-type')
      # First select a real value
      $contactDataSelect.val('firstname').trigger('change')
      expect(@row.getValue('instance::oc:contactdata')).toBe('firstname')
      # Then select placeholder
      $contactDataSelect.val('select').trigger('change')
      expect(@row.getValue('instance::oc:contactdata')).toBe('')

  ###############################################################
  # OC-28306 — a stored width token outside w1-w10 (e.g. "w14") must be
  # shown with an advisory (not silently treated as unset/default) and
  # must survive an edit to an unrelated control in the same panel.
  ###############################################################

  describe 'view.rowDetail.DetailViewMixins: "appearance" (group) — out-of-range Columns in Grid width', ->
    beforeEach ->
      window.xlfHideWarnings = true
      sessionStorage.setItem('kpi.editable-form.form-style', 'theme-grid')
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      @survey = new $model.Survey()
      @survey.rows.add(type: 'group', name: 'grp1', label: 'Group 1', appearance: 'w14')
      @row = @survey.rows.at(0)
      @detail = @row.get('appearance')
      @mixin = @viewRowDetail.DetailViewMixins.appearance
      @$el = $('<div/>')
      @$cardSettingsWrap = $('<div><div class="js-card-settings-appearance"></div></div>')
      @mixin_ctx = $.extend({}, Backbone.Events, @mixin, {
        cid: 'cid_grp_appearance'
        $el: @$el
        $: (sel) => @$el.find(sel)
        model: @detail
        Templates: @viewRowDetail.Templates
        rowView: $.extend({}, Backbone.Events, { cardSettingsWrap: @$cardSettingsWrap, model: @row })
      })
      # html() must run first: it creates @$select_width, which afterRender()
      # (via _afterRenderCardGrid/_writeModelValue) depends on.
      @mixin_ctx.html()
    afterEach ->
      window.xlfHideWarnings = false
      sessionStorage.removeItem('kpi.editable-form.form-style')

    it 'shows the out-of-range advisory and highlights no card (not card 4)', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $wrap = @$cardSettingsWrap.find('.js-group-cols-wrap')
      expect($wrap.length).toBe(1)
      expect($wrap.find('.group-cols-card.is-selected').length).toBe(0)
      expect($wrap.find('.group-cols-card.is-default').length).toBe(0)
      $advisory = $wrap.find('.group-cols__advisory')
      expect($advisory.length).toBe(1)
      expect($advisory.text().indexOf('w14')).not.toBe(-1)

    it 'shows the raw stored token as the collapsed-state pill, not "4 columns"', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $pill = @$cardSettingsWrap.find('.js-group-cols-pill')
      expect($pill.text()).toBe('w14')

    it 'preserves the out-of-range width when only the Appearance card is changed', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $tableListCard = @$el.find('.appearance-card[data-card-slug="table-list"]')
      expect($tableListCard.length).toBe(1)
      $tableListCard.trigger('click')
      expect(@detail.get('value')).toBe('table-list w14')

    it 'clears the advisory and default-card state once the user picks a real column count', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $wrap = @$cardSettingsWrap.find('.js-group-cols-wrap')
      $card6 = $wrap.find('.group-cols-card[data-cols="6"]')
      expect($card6.length).toBe(1)
      $card6.trigger('click')
      expect($wrap.find('.group-cols__advisory').length).toBe(0)
      expect($card6.hasClass('is-selected')).toBe(true)
      expect(@detail.get('value')).toBe('w6')

  describe 'view.rowDetail.DetailViewMixins: "appearance" (item) — out-of-range Item width', ->
    beforeEach ->
      window.xlfHideWarnings = true
      sessionStorage.setItem('kpi.editable-form.form-style', 'theme-grid')
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      @survey = new $model.Survey()
      @survey.rows.add(type: 'text', name: 'q1', label: 'Q1', appearance: 'w14')
      @row = @survey.rows.at(0)
      @detail = @row.get('appearance')
      @mixin = @viewRowDetail.DetailViewMixins.appearance
      @$el = $('<div/>')
      # _afterRenderWidth inserts the item-width section as a sibling right
      # before '.js-card-settings-advanced-toggle' (see OC-28234).
      @$cardSettingsWrap = $('<div><div class="js-card-settings-advanced-toggle"></div></div>')
      @mixin_ctx = $.extend({}, Backbone.Events, @mixin, {
        cid: 'cid_item_appearance'
        $el: @$el
        $: (sel) => @$el.find(sel)
        model: @detail
        Templates: @viewRowDetail.Templates
        rowView: $.extend({}, Backbone.Events, { cardSettingsWrap: @$cardSettingsWrap, model: @row })
      })
      @mixin_ctx.html()
    afterEach ->
      window.xlfHideWarnings = false
      sessionStorage.removeItem('kpi.editable-form.form-style')

    it 'shows the out-of-range advisory and highlights no width card', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $wrap = @$cardSettingsWrap.find('.js-item-width-wrap')
      expect($wrap.length).toBe(1)
      expect($wrap.find('.width-card.is-selected').length).toBe(0)
      $advisory = $wrap.find('.item-width__advisory')
      expect($advisory.length).toBe(1)
      expect($advisory.text().indexOf('w14')).not.toBe(-1)

    it 'shows the raw stored token in the collapsed-state pill, not "Full width"', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $pill = @$cardSettingsWrap.find('.js-item-width-pill')
      # buildWidthPillText has no dedicated out-of-range copy, so both the
      # label and the raw token render as "w14" — redundant but not wrong.
      expect($pill.text().trim()).toBe('w14 · w14')

    it 'preserves the out-of-range width when only the Appearance card is changed', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      $paragraphCard = @$el.find('.appearance-card[data-card-slug="paragraph"]')
      expect($paragraphCard.length).toBe(1)
      $paragraphCard.trigger('click')
      expect(@detail.get('value')).toBe('multiline w14')

  ###############################################################
  # OC-28433: Item width context line names the form (not "No
  # parent group") for ungrouped items, and uses correct singular/
  # plural "column"/"columns" wording everywhere it appears.
  ###############################################################
  describe 'view.rowDetail.DetailViewMixins: "appearance" (item) — Item width context line (OC-28433)', ->
    beforeEach ->
      window.xlfHideWarnings = true
      sessionStorage.setItem('kpi.editable-form.form-style', 'theme-grid')
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      @mixin = @viewRowDetail.DetailViewMixins.appearance
      # Appended to the document — onOcRowStructureChange now requires the
      # settings wrap to be in the document (matches how a genuinely open
      # panel looks), same as the OC-28463 listener below.
      @$testRoot = $('<div/>').appendTo('body')
      @$cardSettingsWrap = $('<div><div class="js-card-settings-advanced-toggle"></div></div>').appendTo(@$testRoot)
    afterEach ->
      window.xlfHideWarnings = false
      sessionStorage.removeItem('kpi.editable-form.form-style')
      @$testRoot?.remove()

    # Builds and expand-renders an appearance mixin for `row`, wired up exactly
    # like the real RowView/DetailView pairing, against the shared
    # @$cardSettingsWrap. Takes mixin/viewRowDetail/$cardSettingsWrap as
    # explicit params (rather than reading `@`) so it has no dependency on the
    # caller's `this` binding.
    renderAppearanceForRow = (mixin, viewRowDetail, $cardSettingsWrap, row) ->
      mixin_ctx = $.extend({}, Backbone.Events, mixin, {
        cid: 'cid_item_appearance'
        $el: $('<div/>')
        $: (sel) -> @$el.find(sel)
        model: row.get('appearance')
        Templates: viewRowDetail.Templates
        rowView: $.extend({}, Backbone.Events, { cardSettingsWrap: $cardSettingsWrap, model: row })
      })
      mixin_ctx.$ = (sel) -> mixin_ctx.$el.find(sel)
      mixin_ctx.html()
      mixin_ctx.afterRender.call(mixin_ctx)
      mixin_ctx

    it 'ungrouped item names the form and its column count, not "No parent group"', ->
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      row = survey.rows.at(0)
      renderAppearanceForRow(@mixin, @viewRowDetail, @$cardSettingsWrap, row)
      contextText = @$cardSettingsWrap.find('.item-width__context').text()
      expect(contextText).toBe('Form has 4 columns')
      expect(contextText.indexOf('No parent group')).toBe(-1)

    it 'ungrouped item still renders the 4-card fraction picker (treated as w4)', ->
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      row = survey.rows.at(0)
      renderAppearanceForRow(@mixin, @viewRowDetail, @$cardSettingsWrap, row)
      $wrap = @$cardSettingsWrap.find('.js-item-width-wrap')
      expect($wrap.find('.width-card').length).toBe(4)
      expect($wrap.find('.width-card__code').map(-> $(@).text()).get()).toEqual(['w4', 'w3', 'w2', 'w1'])

    it 'grouped item in a 1-column group reads "1 column" (singular) on the context line', ->
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey(survey: [
        {type: 'group', name: 'grp1', label: 'Group 1', appearance: 'w1', __rows: [
          {type: 'text', name: 'q1', label: 'Q1'}
        ]}
      ])
      group = survey.rows.at(0)
      row = group.rows.at(0)
      renderAppearanceForRow(@mixin, @viewRowDetail, @$cardSettingsWrap, row)
      contextText = @$cardSettingsWrap.find('.item-width__context').text()
      expect(contextText).toBe('Parent group (grp1) has 1 column')

    it 'grouped item in a 1-column group reads "1 column" (singular) on the span note', ->
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey(survey: [
        {type: 'group', name: 'grp1', label: 'Group 1', appearance: 'w1', __rows: [
          {type: 'text', name: 'q1', label: 'Q1'}
        ]}
      ])
      group = survey.rows.at(0)
      row = group.rows.at(0)
      renderAppearanceForRow(@mixin, @viewRowDetail, @$cardSettingsWrap, row)
      spanNoteText = @$cardSettingsWrap.find('.item-width__span-note').text()
      expect(spanNoteText).toBe('This group has 1 column, so widths are shown as columns.')

    it 'context line refreshes when the item is grouped while its settings panel is open', ->
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      row = survey.rows.at(0)
      renderAppearanceForRow(@mixin, @viewRowDetail, @$cardSettingsWrap, row)
      expect(@$cardSettingsWrap.find('.item-width__context').text()).toBe('Form has 4 columns')

      # Mirrors view.surveyApp.coffee's groupSelectedRows(): reparent the row
      # into a brand-new group, then fire the same DOM event the real UI fires.
      survey._addGroup(__rows: [row])
      document.dispatchEvent(new CustomEvent('ocRowStructureChange'))

      contextText = @$cardSettingsWrap.find('.item-width__context').text()
      expect(contextText.indexOf('Form has')).toBe(-1)
      expect(contextText.indexOf('Parent group (')).toBe(0)

    it 'context line refreshes when the item is ungrouped while its settings panel is open', ->
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey(survey: [
        {type: 'group', name: 'grp1', label: 'Group 1', appearance: 'w4', __rows: [
          {type: 'text', name: 'q1', label: 'Q1'}
        ]}
      ])
      group = survey.rows.at(0)
      row = group.rows.at(0)
      renderAppearanceForRow(@mixin, @viewRowDetail, @$cardSettingsWrap, row)
      expect(@$cardSettingsWrap.find('.item-width__context').text()).toBe('Parent group (grp1) has 4 columns')

      # Mirrors view.row.coffee's _deleteGroup(): unwrap the group, then fire
      # the same DOM event the real UI fires.
      group.splitApart()
      document.dispatchEvent(new CustomEvent('ocRowStructureChange'))

      expect(@$cardSettingsWrap.find('.item-width__context').text()).toBe('Form has 4 columns')

    it 'context line refreshes on grouping for a legacy-path type not in isCardGridType (e.g. image)', ->
      # "image" reaches _afterRenderWidth via _afterRenderLegacy, NOT the
      # card-grid branch of afterRender — the listener must be registered
      # from inside _afterRenderWidth itself, or types like this never get it.
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'image', name: 'q1', label: 'Q1')
      row = survey.rows.at(0)
      mixin_ctx = renderAppearanceForRow(@mixin, @viewRowDetail, @$cardSettingsWrap, row)
      expect(mixin_ctx.isCardGridType()).toBe(false)
      expect(@$cardSettingsWrap.find('.item-width__context').text()).toBe('Form has 4 columns')

      survey._addGroup(__rows: [row])
      document.dispatchEvent(new CustomEvent('ocRowStructureChange'))

      contextText = @$cardSettingsWrap.find('.item-width__context').text()
      expect(contextText.indexOf('Form has')).toBe(-1)
      expect(contextText.indexOf('Parent group (')).toBe(0)

    it 'tears down the ocRowStructureChange listener on remove() for a legacy-path type (e.g. image)', ->
      # Uses the real DetailView class (not the synthetic mixin_ctx harness)
      # so remove() is the actual DetailView.prototype.remove — the fix is
      # rowView._appearanceDV getting set from inside _afterRenderWidth,
      # which is what makes _cleanupExpandedRender's "if @_appearanceDV then
      # @_appearanceDV.remove()" reach legacy-path types at all.
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'image', name: 'q1', label: 'Q1')
      row = survey.rows.at(0)
      detail = row.get('appearance')
      rowView = $.extend({}, Backbone.Events, { cardSettingsWrap: @$cardSettingsWrap, model: row })
      dv = new @viewRowDetail.DetailView({ model: detail, rowView: rowView })
      dv.render()
      expect(dv.isCardGridType()).toBe(false)
      expect(rowView._appearanceDV).toBe(dv)

      renderCount = 0
      original = dv._afterRenderWidth.bind(dv)
      dv._afterRenderWidth = -> renderCount++; original()

      dv.remove()
      document.dispatchEvent(new CustomEvent('ocRowStructureChange'))
      expect(renderCount).toBe(0)

    it 'item whose settings panel was closed (detached wrap) does not update on structural change', ->
      $model = require('../../jsapp/xlform/src/_model')
      survey = new $model.Survey()
      survey.rows.add(type: 'text', name: 'q1', label: 'Q1')
      row = survey.rows.at(0)
      renderAppearanceForRow(@mixin, @viewRowDetail, @$cardSettingsWrap, row)
      expect(@$cardSettingsWrap.find('.item-width__context').text()).toBe('Form has 4 columns')
      @$cardSettingsWrap.detach()  # simulate closing the item's settings panel

      survey._addGroup(__rows: [row])
      document.dispatchEvent(new CustomEvent('ocRowStructureChange'))

      # detached — must not update
      expect(@$cardSettingsWrap.find('.item-width__context').text()).toBe('Form has 4 columns')

  ###############################################################
  # OC-28463: item width picker must re-render when parent group
  # column count changes while the item settings panel is open.
  ###############################################################
  describe 'view.rowDetail.DetailViewMixins: "appearance" (item) — syncs with parent group column change (OC-28463)', ->
    beforeEach ->
      window.xlfHideWarnings = true
      sessionStorage.setItem('kpi.editable-form.form-style', 'theme-grid')
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      @survey = new $model.Survey(survey: [
        {type: 'group', name: 'grp1', label: 'Group 1', appearance: 'w4', __rows: [
          {type: 'text', name: 'q1', label: 'Q1'}
        ]}
      ])
      @group = @survey.rows.at(0)
      @row = @group.rows.at(0)
      @detail = @row.get('appearance')
      @groupDetail = @group.get('appearance')
      mixin = @viewRowDetail.DetailViewMixins.appearance
      @$el = $('<div/>')
      @$testRoot = $('<div/>').appendTo('body')
      @$cardSettingsWrap = $('<div><div class="js-card-settings-advanced-toggle"></div></div>').appendTo(@$testRoot)
      @mixin_ctx = $.extend({}, Backbone.Events, mixin, {
        cid: 'cid_item_appearance'
        $el: @$el
        $: (sel) => @$el.find(sel)
        model: @detail
        Templates: @viewRowDetail.Templates
        rowView: $.extend({}, Backbone.Events, { cardSettingsWrap: @$cardSettingsWrap, model: @row })
      })
      @mixin_ctx.html()
      @mixin_ctx.afterRender.call(@mixin_ctx)
    afterEach ->
      window.xlfHideWarnings = false
      sessionStorage.removeItem('kpi.editable-form.form-style')
      @$testRoot?.remove()

    it 'item width picker rebuilds immediately when parent group column count changes', ->
      $wrap = @$cardSettingsWrap.find('.js-item-width-wrap')
      expect($wrap.find('.width-card').length).toBe(4)
      expect($wrap.find('.item-width__context').text()).toContain('4')
      @groupDetail.set 'value', 'w6'
      $wrapNew = @$cardSettingsWrap.find('.js-item-width-wrap')
      expect($wrapNew.find('.width-card').length).toBe(6)
      expect($wrapNew.find('.item-width__context').text()).toContain('6')

    it 'does not accumulate duplicate listeners across re-renders', ->
      renderCount = 0
      original = @mixin_ctx._afterRenderWidth.bind(@mixin_ctx)
      @mixin_ctx._afterRenderWidth = ->
        renderCount++
        original.call(@)
      # Re-attach so the spy is captured; reset counter, then fire group change.
      @mixin_ctx._afterRenderWidth.call(@mixin_ctx)
      renderCount = 0
      @groupDetail.set 'value', 'w8'
      expect(renderCount).toBe(1)

    it 'sibling item width pickers both rebuild when parent group column count changes', ->
      $model = require('../../jsapp/xlform/src/_model')
      survey2 = new $model.Survey(survey: [
        {type: 'group', name: 'grp2', label: 'Group 2', appearance: 'w4', __rows: [
          {type: 'text', name: 'qa', label: 'Q A'}
          {type: 'text', name: 'qb', label: 'Q B'}
        ]}
      ])
      group2   = survey2.rows.at(0)
      rowA     = group2.rows.at(0)
      rowB     = group2.rows.at(1)
      grpDetail = group2.get('appearance')
      mixin = @viewRowDetail.DetailViewMixins.appearance

      $sibRoot = $('<div/>').appendTo('body')

      $elA = $('<div/>')
      $wrapA = $('<div><div class="js-card-settings-advanced-toggle"></div></div>').appendTo($sibRoot)
      ctxA = $.extend({}, Backbone.Events, mixin, {
        cid: 'cid_qA_appearance'
        $el: $elA
        $: (sel) -> $elA.find(sel)
        model: rowA.get('appearance')
        Templates: @viewRowDetail.Templates
        rowView: $.extend({}, Backbone.Events, { cardSettingsWrap: $wrapA, model: rowA })
      })

      $elB = $('<div/>')
      $wrapB = $('<div><div class="js-card-settings-advanced-toggle"></div></div>').appendTo($sibRoot)
      ctxB = $.extend({}, Backbone.Events, mixin, {
        cid: 'cid_qB_appearance'
        $el: $elB
        $: (sel) -> $elB.find(sel)
        model: rowB.get('appearance')
        Templates: @viewRowDetail.Templates
        rowView: $.extend({}, Backbone.Events, { cardSettingsWrap: $wrapB, model: rowB })
      })

      ctxA.html()
      ctxA.afterRender.call(ctxA)
      ctxB.html()
      ctxB.afterRender.call(ctxB)

      expect($wrapA.find('.width-card').length).toBe(4)
      expect($wrapB.find('.width-card').length).toBe(4)
      grpDetail.set 'value', 'w6'
      expect($wrapA.find('.width-card').length).toBe(6)
      expect($wrapB.find('.width-card').length).toBe(6)

      $sibRoot.remove()
      return

    it 'item whose settings panel was closed (detached wrap) does not update the detached DOM on group column change', ->
      $model = require('../../jsapp/xlform/src/_model')
      survey3 = new $model.Survey(survey: [
        {type: 'group', name: 'grp3', label: 'Group 3', appearance: 'w4', __rows: [
          {type: 'text', name: 'qx', label: 'Q X'}
          {type: 'text', name: 'qy', label: 'Q Y'}
        ]}
      ])
      group3    = survey3.rows.at(0)
      rowX      = group3.rows.at(0)
      rowY      = group3.rows.at(1)
      grpDetail3 = group3.get('appearance')
      mixin = @viewRowDetail.DetailViewMixins.appearance

      $root = $('<div/>').appendTo('body')
      $wrapX = $('<div><div class="js-card-settings-advanced-toggle"></div></div>').appendTo($root)
      $elX = $('<div/>')
      ctxX = $.extend({}, Backbone.Events, mixin, {
        cid: 'cid_qX_appearance'
        $el: $elX
        $: (sel) -> $elX.find(sel)
        model: rowX.get('appearance')
        Templates: @viewRowDetail.Templates
        rowView: $.extend({}, Backbone.Events, { cardSettingsWrap: $wrapX, model: rowX })
      })
      ctxX.html()
      ctxX.afterRender.call(ctxX)
      expect($wrapX.find('.width-card').length).toBe(4)
      $wrapX.detach()  # simulate closing item X's settings panel

      $wrapY = $('<div><div class="js-card-settings-advanced-toggle"></div></div>').appendTo($root)
      $elY = $('<div/>')
      ctxY = $.extend({}, Backbone.Events, mixin, {
        cid: 'cid_qY_appearance'
        $el: $elY
        $: (sel) -> $elY.find(sel)
        model: rowY.get('appearance')
        Templates: @viewRowDetail.Templates
        rowView: $.extend({}, Backbone.Events, { cardSettingsWrap: $wrapY, model: rowY })
      })
      ctxY.html()
      ctxY.afterRender.call(ctxY)
      expect($wrapY.find('.width-card').length).toBe(4)

      grpDetail3.set 'value', 'w8'
      expect($wrapX.find('.width-card').length).toBe(4)  # detached — must not update
      expect($wrapY.find('.width-card').length).toBe(8)  # live — must update

      $root.remove()
      return

  ###############################################################
  # view.rowDetail: DetailViewMixins.appearance — onOcFormStyleChange
  ###############################################################
  describe 'view.rowDetail.DetailViewMixins.appearance: onOcFormStyleChange()', ->
    beforeEach ->
      window.t ?= (str) -> str
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      @mixin = @viewRowDetail.DetailViewMixins.appearance

      @cardSettingsWrap = $('<div class="card__settings">')
        .append($('<div class="js-group-cols-wrap">'))
        .append($('<div class="js-item-width-wrap">'))

      @ctx =
        rowView: cardSettingsWrap: @cardSettingsWrap
        model: _parent: {}
        isCardGridType: -> true
        is_form_style_theme_grid: -> false
        model_type: -> 'select_one'
        _afterRenderGroupCols: ->
        _afterRenderWidth: ->
        get_width_token_from_model_value: -> null

    it 'returns early when not a card grid type', ->
      widthCalled = false
      @ctx.isCardGridType = -> false
      @ctx._afterRenderWidth = -> widthCalled = true
      @mixin.onOcFormStyleChange.call(@ctx)
      expect(widthCalled).toBe(false)

    it 'switching TO grid on a non-group calls _afterRenderWidth', ->
      widthCalled = false
      @ctx.is_form_style_theme_grid = -> true
      @ctx.model_type = -> 'select_one'
      @ctx._afterRenderWidth = -> widthCalled = true
      @mixin.onOcFormStyleChange.call(@ctx)
      expect(widthCalled).toBe(true)

    it 'switching TO grid on a group calls _afterRenderGroupCols', ->
      groupColsCalled = false
      @ctx.is_form_style_theme_grid = -> true
      @ctx.model_type = -> 'group'
      @ctx._afterRenderGroupCols = -> groupColsCalled = true
      @mixin.onOcFormStyleChange.call(@ctx)
      expect(groupColsCalled).toBe(true)

    it 'switching AWAY from grid on a non-group removes .js-item-width-wrap', ->
      @ctx.is_form_style_theme_grid = -> false
      @ctx.model_type = -> 'select_one'
      @mixin.onOcFormStyleChange.call(@ctx)
      expect(@cardSettingsWrap.find('.js-item-width-wrap').length).toBe(0)

    it 'switching AWAY from grid on a group removes .js-group-cols-wrap', ->
      @ctx.is_form_style_theme_grid = -> false
      @ctx.model_type = -> 'group'
      @mixin.onOcFormStyleChange.call(@ctx)
      expect(@cardSettingsWrap.find('.js-group-cols-wrap').length).toBe(0)

    it 'switching TO grid on a repeat calls _afterRenderGroupCols', ->
      groupColsCalled = false
      @ctx.is_form_style_theme_grid = -> true
      @ctx.model_type = -> 'repeat'
      @ctx._afterRenderGroupCols = -> groupColsCalled = true
      @mixin.onOcFormStyleChange.call(@ctx)
      expect(groupColsCalled).toBe(true)

    it 'switching AWAY from grid on a repeat removes .js-group-cols-wrap', ->
      @ctx.is_form_style_theme_grid = -> false
      @ctx.model_type = -> 'repeat'
      @mixin.onOcFormStyleChange.call(@ctx)
      expect(@cardSettingsWrap.find('.js-group-cols-wrap').length).toBe(0)

  ###############################################################
  # view.rowDetail: parseAppearanceValue — repeat type
  ###############################################################
  describe 'view.rowDetail: parseAppearanceValue() with repeat type', ->
    beforeEach ->
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      @parse = @viewRowDetail.parseAppearanceValue

    it 'defaults to standard-group card when appearance is empty', ->
      result = @parse('', 'repeat')
      expect(result.card).toBe('standard-group')
      expect(result.columnCount).toBe(null)

    it 'recognises table-list', ->
      result = @parse('table-list', 'repeat')
      expect(result.card).toBe('table-list')

    it 'field-list maps to same-screen (matching group behaviour)', ->
      result = @parse('field-list', 'repeat')
      expect(result.card).toBe('same-screen')

    it 'w-token is stripped — defaults to standard-group (groups have no column-count card)', ->
      result = @parse('w3', 'repeat')
      expect(result.card).toBe('standard-group')

    it 'matches group card set for an unknown value', ->
      groupResult = @parse('unknown-value', 'group')
      repeatResult = @parse('unknown-value', 'repeat')
      expect(repeatResult.card).toBe(groupResult.card)

  ###############################################################
  # view.rowDetail: isCardGridType — repeat type
  ###############################################################
  describe 'view.rowDetail.DetailViewMixins.appearance: isCardGridType() for repeat', ->
    beforeEach ->
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      @mixin = @viewRowDetail.DetailViewMixins.appearance

    it 'returns true for repeat type', ->
      ctx = model_type: -> 'repeat'
      expect(@mixin.isCardGridType.call(ctx)).toBe(true)

  ###############################################################
  # view.rowDetail: appearance panel renders Columns in Grid for repeat
  ###############################################################
  describe 'view.rowDetail.DetailViewMixins: "appearance" (repeat) — renders Columns in Grid', ->
    beforeEach ->
      window.xlfHideWarnings = true
      sessionStorage.setItem('kpi.editable-form.form-style', 'theme-grid')
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      @survey = new $model.Survey()
      @survey.rows.add(type: 'repeat', name: 'rep1', label: 'Repeat 1')
      @row = @survey.rows.at(0)
      @detail = @row.get('appearance')
      @mixin = @viewRowDetail.DetailViewMixins.appearance
      @$el = $('<div/>')
      @$cardSettingsWrap = $('<div><div class="js-card-settings-appearance"></div></div>')
      @mixin_ctx = $.extend({}, Backbone.Events, @mixin, {
        cid: 'cid_rep_appearance'
        $el: @$el
        $: (sel) => @$el.find(sel)
        model: @detail
        Templates: @viewRowDetail.Templates
        rowView: $.extend({}, Backbone.Events, { cardSettingsWrap: @$cardSettingsWrap, model: @row })
      })
      @mixin_ctx.html()
    afterEach ->
      window.xlfHideWarnings = false
      sessionStorage.removeItem('kpi.editable-form.form-style')

    it 'renders the Columns in Grid section (.js-group-cols-wrap)', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      expect(@$cardSettingsWrap.find('.js-group-cols-wrap').length).toBe(1)

    it 'renders the same appearance card set as a group', ->
      @mixin_ctx.afterRender.call(@mixin_ctx)
      repeatCards = @$el.find('.appearance-card').map(-> $(@).data('card-slug')).get()
      @survey2 = new (require('../../jsapp/xlform/src/_model')).Survey()
      @survey2.rows.add(type: 'group', name: 'grp1', label: 'Group 1')
      groupRow = @survey2.rows.at(0)
      groupDetail = groupRow.get('appearance')
      $el2 = $('<div/>')
      $wrap2 = $('<div><div class="js-card-settings-appearance"></div></div>')
      groupCtx = $.extend({}, Backbone.Events, @mixin, {
        cid: 'cid_grp2'
        $el: $el2
        $: (sel) => $el2.find(sel)
        model: groupDetail
        Templates: @viewRowDetail.Templates
        rowView: $.extend({}, Backbone.Events, { cardSettingsWrap: $wrap2, model: groupRow })
      })
      groupCtx.html()
      groupCtx.afterRender.call(groupCtx)
      groupCards = $el2.find('.appearance-card').map(-> $(@).data('card-slug')).get()
      expect(repeatCards).toEqual(groupCards)

  ###############################################################
  # OC-28401 — a "Custom" appearance card has no keyword the grid
  # theme can infer a default width from (unlike the built-in
  # cards), so the *effective* width must be written explicitly.
  # Previously, if the item width was never explicitly touched (the
  # default width applies implicitly, no "wN" token on the model),
  # switching to "Custom" produced e.g. "other" with the width
  # silently dropped instead of "other w4".
  ###############################################################

  describe 'view.rowDetail.DetailViewMixins: "appearance" (item) — Custom appearance width (OC-28401)', ->
    makeCtx = (@_this, groupCols) ->
      survey = new (require('../../jsapp/xlform/src/_model')).Survey(survey: [
        {type: 'group', name: 'grp1', label: 'Group 1', appearance: (if groupCols? then "w#{groupCols}" else undefined), __rows: [
          {type: 'text', name: 'q1', label: 'Q1'}
        ]}
      ])
      group = survey.rows.at(0)
      row = group.rows.at(0)
      detail = row.get('appearance')
      viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      mixin = viewRowDetail.DetailViewMixins.appearance
      $el = $('<div/>')
      $cardSettingsWrap = $('<div><div class="js-card-settings-advanced-toggle"></div></div>')
      mixin_ctx = $.extend({}, Backbone.Events, mixin, {
        cid: 'cid_item_appearance'
        $el: $el
        $: (sel) -> $el.find(sel)
        model: detail
        Templates: viewRowDetail.Templates
        rowView: $.extend({}, Backbone.Events, { cardSettingsWrap: $cardSettingsWrap, model: row })
      })
      mixin_ctx.html()
      { mixin_ctx, $el, $cardSettingsWrap, detail }

    beforeEach ->
      window.xlfHideWarnings = true
      sessionStorage.setItem('kpi.editable-form.form-style', 'theme-grid')
    afterEach ->
      window.xlfHideWarnings = false
      sessionStorage.removeItem('kpi.editable-form.form-style')

    it 'writes the implicit default width (w4) once appearance is switched to Custom, with width left untouched', ->
      { mixin_ctx, $el, detail } = makeCtx(@, null)
      mixin_ctx.afterRender.call(mixin_ctx)
      expect(detail.get('value')).toBe('')
      $customCard = $el.find('.appearance-card[data-card-slug="custom"]')
      expect($customCard.length).toBe(1)
      $customCard.trigger('click')
      expect(detail.get('value')).toBe('other w4')

    it 'writes the group\'s actual default width (not w4) when the group has a non-default column count', ->
      { mixin_ctx, $el, detail } = makeCtx(@, 6)
      mixin_ctx.afterRender.call(mixin_ctx)
      $customCard = $el.find('.appearance-card[data-card-slug="custom"]')
      $customCard.trigger('click')
      expect(detail.get('value')).toBe('other w6')

    it 'keeps an explicitly-picked width when appearance is switched to Custom afterwards', ->
      { mixin_ctx, $el, $cardSettingsWrap, detail } = makeCtx(@, null)
      mixin_ctx.afterRender.call(mixin_ctx)
      $w2card = $cardSettingsWrap.find('.js-item-width-wrap .width-card[data-width-slug="w2"]')
      expect($w2card.length).toBe(1)
      $w2card.trigger('click')
      expect(detail.get('value')).toBe('w2')
      $customCard = $el.find('.appearance-card[data-card-slug="custom"]')
      $customCard.trigger('click')
      expect(detail.get('value')).toBe('other w2')

    it 'preserves the custom text typed after switching to Custom, alongside the implicit default width', ->
      { mixin_ctx, $el, detail } = makeCtx(@, null)
      mixin_ctx.afterRender.call(mixin_ctx)
      $customCard = $el.find('.appearance-card[data-card-slug="custom"]')
      $customCard.trigger('click')
      $input = $el.find('.appearance-custom-input')
      expect($input.length).toBe(1)
      $input.val('compact')
      $input.trigger('change')
      expect(detail.get('value')).toBe('compact w4')

    it 'does not add an explicit width to a non-Custom card when width is left unchanged (no behavior change)', ->
      { mixin_ctx, $el, detail } = makeCtx(@, null)
      mixin_ctx.afterRender.call(mixin_ctx)
      $paragraphCard = $el.find('.appearance-card[data-card-slug="paragraph"]')
      expect($paragraphCard.length).toBe(1)
      $paragraphCard.trigger('click')
      expect(detail.get('value')).toBe('multiline')

  ###############################################################
  # OC-28400: _writeWidthValue must sync $select_width so that a
  # subsequent _writeModelValue call does not overwrite the newly
  # selected width with the stale value from render time.
  ###############################################################
  describe 'view.rowDetail.DetailViewMixins.appearance: _writeWidthValue syncs $select_width', ->
    beforeEach ->
      window.xlfHideWarnings = true
      sessionStorage.setItem('kpi.editable-form.form-style', 'theme-grid')
      @viewRowDetail = require('../../jsapp/xlform/src/view.rowDetail')
      $model = require('../../jsapp/xlform/src/_model')
      @survey = new $model.Survey()
      @survey.rows.add(type: 'group', name: 'grp1', label: 'Group 1', appearance: 'w4')
      @group = @survey.rows.at(0)
      @group.rows.add(type: 'select_one', name: 'q1', label: 'Q1', appearance: 'w3')
      @row = @group.rows.at(0)
      @detail = @row.get('appearance')
      @mixin = @viewRowDetail.DetailViewMixins.appearance
      @$el = $('<div/>')
      @$cardSettingsWrap = $("""
        <div>
          <div class="js-card-settings-appearance">
            <span class="js-appearance-pill"></span>
            <button class="js-appearance-toggle"></button>
          </div>
          <div class="js-card-settings-advanced-toggle"></div>
        </div>
      """)
      @mixin_ctx = $.extend({}, Backbone.Events, @mixin, {
        cid: 'cid_q1_appearance'
        $el: @$el
        $: (sel) => @$el.find(sel)
        model: @detail
        Templates: @viewRowDetail.Templates
        rowView: $.extend({}, Backbone.Events, { cardSettingsWrap: @$cardSettingsWrap, model: @row })
      })
      @mixin_ctx.html()
    afterEach ->
      window.xlfHideWarnings = false
      sessionStorage.removeItem('kpi.editable-form.form-style')

    it 'preserves newly selected width when appearance is changed after width', ->
      # afterRender syncs @$select_width to the stored "w3"
      @mixin_ctx.afterRender.call(@mixin_ctx)
      # Simulate clicking width card "w2" (user changes from w3 to w2)
      @mixin_ctx._writeWidthValue.call(@mixin_ctx, 'w2')
      # Simulate clicking appearance card "paragraph"
      @mixin_ctx._card = 'paragraph'
      @mixin_ctx._columnCount = null
      @mixin_ctx._customText = null
      @mixin_ctx._writeModelValue.call(@mixin_ctx)
      # Width must be w2 (new selection), not the stale w3 from render time
      val = @detail.get('value')
      expect(val.indexOf('w2')).not.toBe(-1)
      expect(val.indexOf('w3')).toBe(-1)
