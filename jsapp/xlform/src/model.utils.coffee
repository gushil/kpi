_ = require 'underscore'
$skipLogicParser = require './model.skipLogicParser'
$validationLogicParser = require './model.validationLogicParser'
$configs = require './model.configs'

module.exports = do ->

  utils =
    skipLogicParser: $skipLogicParser
    validationLogicParser: $validationLogicParser

  _trim = (str)->
    return str.replace(/^[\s\t\uFEFF\xA0]+|[\s\t\uFEFF\xA0]+$/g, '')

  utils.split_paste = (str)->
    out = []
    for row in str.split('\n')
      trimmed = _trim(row)
      unless trimmed.match(/^\s*$/)
        out.push(trimmed.split(/\t/))
    out_out = []
    for row in out[1..]
      orow = []
      for n in [0...row.length]
        key = out[0][n]
        val = row[n]
        if val.length > 0
          orow.push([key, val])
      out_out.push(_.object(orow))
    return out_out

  utils.parseHelper =
    parseSkipLogic: (collection, value, parent_row) ->
      collection.meta.set("rawValue", value)
      try
        parsedValues = $skipLogicParser(value)
        collection.reset()
        collection.parseable = true
        for crit in parsedValues.criteria
          opts = {
            name: crit.name
            expressionCode: crit.operator
          }
          if crit.operator is "multiplechoice_selected"
            opts.criterionOption = collection.getSurvey().findRowByName(crit.name).getList().options.get(crit.response_value)
          else
            opts.criterion = crit.response_value
          collection.add(opts, silent: true, _parent: parent_row)
        if parsedValues.operator
          collection.meta.set("delimSelect", parsedValues.operator.toLowerCase())
          return
      catch e
        collection.parseable = false
        return

  utils.sluggifyLabel = (str, other_names=[], character_limit=30, chars_exception=false)->
    return utils.sluggify(str, {
        preventDuplicates: other_names
        lowerCase: false
        preventDuplicateUnderscores: true
        stripSpaces: true
        lrstrip: true
        incrementorPadding: 3
        validXmlTag: true
        characterLimit: character_limit,
        nonWordCharsExceptions: chars_exception
      })

  utils.isValidXmlTag = (str)->
    return str.search(/^[a-zA-Z_:]([a-zA-Z0-9_:.])*$/) is 0

  utils.sluggify = (str, opts={})->
    if str == ''
      return ''
    # Convert text to a friendly format. Rules are passed as options
    opts = _.defaults(opts, {
        # l/r strip: strip spaces from begin/end of string
        lrstrip: false
        lstrip: false
        rstrip: false
        # descriptor: used in error messages
        descriptor: "slug"
        lowerCase: true
        replaceNonWordCharacters: true
        nonWordCharsExceptions: false
        preventDuplicateUnderscores: false
        validXmlTag: false
        underscores: true
        characterLimit: 30
        # preventDuplicates: an array with a list of values that should be avoided
        preventDuplicates: false
        incrementorPadding: false
      })

    if opts.lrstrip
      opts.lstrip = true
      opts.rstrip = true

    if opts.lstrip
      str = str.replace(/^\s+/, "")

    if opts.rstrip
      str = str.replace(/\s+$/, "")

    if opts.lowerCase
      str = str.toLowerCase()

    if opts.underscores
      str = str.replace(/\s/g, "_").replace(/[_]+/g, "_")

    if opts.replaceNonWordCharacters
      if opts.nonWordCharsExceptions
        regex = ///\W^[#{opts.nonWordCharsExceptions}]///g
      else
        regex = /\W+/g
      str = str.replace(regex, '_')
      # possibly a bit specific, but removes an underscore from the end
      # of the string
      if str.match(/._$/)
        str = str.replace(/_$/, '')

    if _.isNumber opts.characterLimit
      str = str.slice(0, opts.characterLimit)

    if opts.validXmlTag
      if str[0].match(/^\d/)
        str = "_" + str

    if opts.preventDuplicateUnderscores
      while str.search(/__/) isnt -1
        str = str.replace(/__/, '_')

    if _.isArray(opts.preventDuplicates)
      str = do ->
        names_lc = (name.toLowerCase()  for name in opts.preventDuplicates when name)
        attempt_base = str

        if attempt_base.length is 0
          throw new Error("Renaming Error: #{opts.descriptor} is empty")

        attempt = attempt_base
        increment = 0
        while attempt.toLowerCase() in names_lc
          increment++
          increment_str = "#{increment}"
          if opts.incrementorPadding and increment < Math.pow(10, opts.incrementorPadding)
            increment_str = ("000000000000" + increment).slice(-1 * opts.incrementorPadding)
          attempt = "#{attempt_base}_#{increment_str}"
        return attempt

    return str

  # OC (OC-28780): is `key` in `hiddenFields`, exactly or as a translation?
  # `translatedOnlyFields` is for fields that DO have their own dedicated
  # settings field for the primary language (e.g. 'constraint_message' has
  # its own "Constraint Message" box) but should still be hidden for every
  # OTHER language, so only their '<field>::<lang>' form counts as hidden,
  # never the bare name.
  #
  # Example: hiddenFields includes 'label'. On a form with 2+ languages,
  # the non-primary-language value of a field gets its own key, so a
  # French label shows up as 'label::French' (see flatten_translated_fields
  # in model.inputParser.coffee). Both 'label' and 'label::French' should
  # count as hidden - otherwise the French label leaks into the Form
  # Designer row settings as its own field.
  utils.isHiddenField = (key, hiddenFields, translatedOnlyFields = []) ->
    return true if key in hiddenFields
    return true if _.some(hiddenFields, (f) -> key.indexOf("#{f}::") is 0)
    return _.some(translatedOnlyFields, (f) -> key.indexOf("#{f}::") is 0)

  # OC (OC-28464): decide whether to prompt the user to make an item
  # read-only. A non-Calculate item that carries a calculation must be
  # read-only (otherwise it errors when the form is added to a study),
  # unless it has a trigger selected or is already read-only.
  utils.shouldShowCalculationReadonlyHint = (opts = {}) ->
    questionType = opts.questionType
    calculation = opts.calculation or ''
    trigger = opts.trigger or ''
    readonly = opts.readonly

    if questionType is 'calculate'
      return false
    if ("#{calculation}").trim() is ''
      return false
    if ("#{trigger}").trim() isnt ''
      return false
    if readonly is true or ("#{readonly}" in $configs.truthyValues)
      return false
    return true

  # OC (OC-28966): port of pyxform's expression lexer (get_expression_lexer
  # in pyxform utils.py, pinned c1ffe27). Rule order is significant: like
  # re.Scanner, the first rule that matches at a position wins, so `-5` is
  # a NUMBER (not an operator), `5-3` is two NUMBERs, and `divide` starts
  # with the `div` operator.
  # `\xc0-\xd6\]` copies a pyxform typo (missing `[`) so both agree.
  _ncStart = /([A-Z]|_|[a-z]|\xc0-\xd6\]|[\xd8-\xf6]|[\xf8-˿]|[Ͱ-ͽ]|[Ϳ-῿]|[‌-‍]|[⁰-↏]|[Ⰰ-⿯]|[、-퟿]|[豈-﷏]|[ﷰ-�]|[\u{10000}-\u{effff}])/u.source
  _ncChar = /[-.0-9\xb7̀-ͯ‿-⁀]/u.source
  _ncname = "(#{_ncStart})(#{_ncStart}|#{_ncChar})*"
  _ncname = "#{_ncname}(:#{_ncname})?"
  _date = /-?\d{4}-\d{2}-\d{2}/.source
  _time = /\d{2}:\d{2}:\d{2}(\.\s+)?(((\+|-)\d{2}:\d{2})|Z)?/.source
  _lexerRules = _.map([
    ['DATETIME', "#{_date}T#{_time}"]
    ['DATE', _date]
    ['TIME', _time]
    ['NUMBER', /-?\d+\.\d*|-?\.\d+|-?\d+/.source]
    ['OPS_MATH', /[*+\-]|mod|div/.source]
    ['OPS_COMP', /=|!=|<|>|<=|>=/.source]
    ['OPS_BOOL', /and|or/.source]
    ['OPS_UNION', /\|/.source]
    ['OPEN_PAREN', /\(/.source]
    ['CLOSE_PAREN', /\)/.source]
    ['BRACKET', /\[\]\{\}/.source]
    ['PARENT_REF', /\.\./.source]
    ['SELF_REF', /\./.source]
    ['PATH_SEP', /\//.source]
    ['SYSTEM_LITERAL', /"[^"]*"|'[^']*'/.source]
    ['COMMA', /,/.source]
    ['WHITESPACE', /\s+/.source]
    ['PYXFORM_REF', "\\$\\{#{_ncname}(##{_ncname})?\\}"]
    ['FUNC_CALL', "#{_ncname}\\("]
    ['XPATH_PRED', "#{_ncname}\\["]
    ['URI_SCHEME', "#{_ncname}://"]
    ['NAME', _ncname]
    ['OTHER', /.+?/.source]
  ], ([name, source]) -> return [name, new RegExp(source, 'uy')])
  _dynamicTokens = ['OPS_MATH', 'OPS_UNION', 'XPATH_PRED', 'PYXFORM_REF', 'FUNC_CALL']

  # OC (OC-28966): port of pyxform's default_is_dynamic for a Calculate item
  # (the date/geo hyphen exception does not apply to that type). True when
  # the default contains a math operator, a union, a ${ref}, a function
  # call or a predicate.
  utils.isDefaultDynamic = (value) ->
    return false unless typeof value is 'string'
    pos = 0
    while pos < value.length
      token = null
      for [name, re] in _lexerRules
        re.lastIndex = pos
        if re.exec(value)
          token = name
          pos = re.lastIndex
          break
      # like re.Scanner, stop at text no rule matches
      return false unless token
      return true if token in _dynamicTokens
    return false

  # OC (OC-28966): the converter rejects a Calculate item with "Missing
  # calculation" only when the calculation is empty and the default is not
  # dynamic (xls2json.py). Drives the Calculation tab's red ! and
  # "This field is required" message.
  utils.isCalculationMissing = (calculation, defaultValue) ->
    return false if ("#{calculation or ''}").trim() isnt ''
    return not utils.isDefaultDynamic(defaultValue)

  return utils
