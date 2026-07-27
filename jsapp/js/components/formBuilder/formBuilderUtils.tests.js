import {
  applyFreshPrimaryLanguage,
  mergeFreshTranslations,
  nullifyTranslations,
  readParameters,
  resolveCurrentPrimaryLanguage,
  unnullifyTranslations,
  writeParameters,
} from '#/components/formBuilder/formBuilderUtils'

describe('translations hack', () => {
  describe('nullifyTranslations', () => {
    it('should return array with null for no translations', () => {
      const test = {
        survey: [
          {
            label: ['Hello'],
          },
        ],
      }
      const target = {
        survey: [{ label: ['Hello'] }],
        translations: [null],
      }
      expect(nullifyTranslations(test.translations, test.translated, test.survey, test.baseSurvey)).to.deep.equal(
        target,
      )
    })

    it('should throw if there are unnamed translations', () => {
      const test = {
        survey: [
          {
            label: ['Hello'],
          },
        ],
        translations: [null, 'English (en)'],
      }
      expect(() => {
        nullifyTranslations(test.translations, test.translated, test.survey, test.baseSurvey)
      }).to.throw()
    })

    it('should not reorder anything if survey has same default language as base survey', () => {
      const test = {
        baseSurvey: { _initialParams: { translations_0: 'English (en)' } },
        survey: [
          {
            label: ['Hello', 'Cześć'],
          },
        ],
        translations: ['English (en)', 'Polski (pl)'],
        translated: ['label'],
      }
      const target = {
        survey: [
          {
            label: ['Hello', 'Cześć'],
          },
        ],
        translations: [null, 'Polski (pl)'],
        translations_0: 'English (en)',
      }
      expect(nullifyTranslations(test.translations, test.translated, test.survey, test.baseSurvey)).to.deep.equal(
        target,
      )
    })

    it('should reorder translated props if survey has same default language as base survey but in different order (as last)', () => {
      const test = {
        baseSurvey: { _initialParams: { translations_0: 'English (en)' } },
        survey: [
          {
            label: ['Allo', 'Cześć', 'Hello'],
          },
        ],
        translations: ['Francais (fr)', 'Polski (pl)', 'English (en)'],
        translated: ['label'],
      }
      const target = {
        survey: [
          {
            label: ['Hello', 'Allo', 'Cześć'],
          },
        ],
        translations: [null, 'Francais (fr)', 'Polski (pl)'],
        translations_0: 'English (en)',
      }
      expect(nullifyTranslations(test.translations, test.translated, test.survey, test.baseSurvey)).to.deep.equal(
        target,
      )
    })

    it('should reorder translated props if survey has same default language as base survey but in different order (as not last)', () => {
      const test = {
        baseSurvey: { _initialParams: { translations_0: 'English (en)' } },
        survey: [
          {
            label: ['Allo', 'Cześć', 'Hello', 'Hallo'],
          },
        ],
        translations: ['Francais (fr)', 'Polski (pl)', 'English (en)', 'Deutsch (de)'],
        translated: ['label'],
      }
      const target = {
        survey: [
          {
            label: ['Hello', 'Allo', 'Cześć', 'Hallo'],
          },
        ],
        translations: [null, 'Francais (fr)', 'Polski (pl)', 'Deutsch (de)'],
        translations_0: 'English (en)',
      }
      expect(nullifyTranslations(test.translations, test.translated, test.survey, test.baseSurvey)).to.deep.equal(
        target,
      )
    })

    it("should add base survey's default language if survey doesn't have it", () => {
      const test = {
        baseSurvey: { _initialParams: { translations_0: 'English (en)' } },
        survey: [
          {
            label: ['Allo', 'Cześć'],
            name: 'welcome_message',
          },
        ],
        translations: ['Francais (fr)', 'Polski (pl)'],
        translated: ['label'],
      }
      const target = {
        survey: [
          {
            label: ['welcome_message', 'Allo', 'Cześć'],
            name: 'welcome_message',
          },
        ],
        translations: [null, 'Francais (fr)', 'Polski (pl)'],
        translations_0: 'English (en)',
      }
      expect(nullifyTranslations(test.translations, test.translated, test.survey, test.baseSurvey)).to.deep.equal(
        target,
      )
    })

    it('should add null language if base survey has no translations but survey does', () => {
      const test = {
        baseSurvey: { _initialParams: {} },
        survey: [
          {
            label: ['Allo', 'Cześć'],
            name: 'welcome_message',
          },
        ],
        translations: ['Francais (fr)', 'Polski (pl)'],
        translated: ['label'],
      }
      const target = {
        survey: [
          {
            label: ['welcome_message', 'Allo', 'Cześć'],
            name: 'welcome_message',
          },
        ],
        translations: [null, 'Francais (fr)', 'Polski (pl)'],
      }
      expect(nullifyTranslations(test.translations, test.translated, test.survey, test.baseSurvey)).to.deep.equal(
        target,
      )
    })

    it('should do nothing if neither base survey nor survey have translations', () => {
      const test = {
        baseSurvey: { _initialParams: {} },
        survey: [
          {
            label: ['Hello'],
          },
        ],
        translations: [null],
        translated: [],
      }
      const target = {
        survey: [
          {
            label: ['Hello'],
          },
        ],
        translations: [null],
      }
      expect(nullifyTranslations(test.translations, test.translated, test.survey, test.baseSurvey)).to.deep.equal(
        target,
      )
    })
  })

  describe('unnullifyTranslations', () => {
    it("should set default language if it's not set already", () => {
      const test = {
        surveyDataJSON: JSON.stringify({
          survey: [
            {
              label: 'Cheese?',
            },
          ],
          settings: [{}],
        }),
        assetContent: {
          translated: ['label'],
          translations_0: 'English (en)',
        },
      }
      const target = JSON.stringify({
        survey: [
          {
            'label::English (en)': 'Cheese?',
          },
        ],
        settings: [
          {
            default_language: 'English (en)',
          },
        ],
      })
      expect(unnullifyTranslations(test.surveyDataJSON, test.assetContent)).to.deep.equal(target)
    })

    it('should replace nullified props with translated ones', () => {
      const test = {
        surveyDataJSON: JSON.stringify({
          survey: [
            {
              label: 'Cheese?',
              'label::Polski (pl)': 'Ser?',
            },
          ],
          choices: [
            {
              label: 'Yes',
            },
            {
              label: 'No',
              'label::Polski (pl)': 'Nie',
            },
          ],
          settings: [
            {
              default_language: 'English (en)',
            },
          ],
        }),
        assetContent: {
          translated: ['label'],
          translations_0: 'English (en)',
        },
      }
      const target = JSON.stringify({
        survey: [
          {
            'label::Polski (pl)': 'Ser?',
            'label::English (en)': 'Cheese?',
          },
        ],
        choices: [
          {
            'label::English (en)': 'Yes',
          },
          {
            'label::Polski (pl)': 'Nie',
            'label::English (en)': 'No',
          },
        ],
        settings: [
          {
            default_language: 'English (en)',
          },
        ],
      })
      expect(unnullifyTranslations(test.surveyDataJSON, test.assetContent)).to.deep.equal(target)
    })
  })
})

describe('readParameters', () => {
  const validReadPairs = [
    {
      str: 'foo=',
      obj: { foo: '' },
      note: 'empty parameter',
    },
    {
      str: 'foo=;bar=1;fum=;baz=',
      obj: { foo: '', bar: '1', fum: '', baz: '' },
      note: 'empty parameters',
    },
    {
      str: 'foo=bar',
      obj: { foo: 'bar' },
      note: 'single parameter',
    },
    {
      str: 'foo=1 bar=10 fum=1',
      obj: { foo: '1', bar: '10', fum: '1' },
      note: 'space-separated parameters',
    },
    {
      str: 'foo=1,bar=10,fum=1',
      obj: { foo: '1', bar: '10', fum: '1' },
      note: 'comma-separated parameters',
    },
    {
      str: 'foo=1;bar=10;fum=1',
      obj: { foo: '1', bar: '10', fum: '1' },
      note: 'semicolon-separated parameters',
    },
    {
      str: 'foo  = 1    bar  =  10    fum  =  1',
      obj: { foo: '1', bar: '10', fum: '1' },
      note: 'space-dirty space-separated parameters',
    },
    {
      str: 'foo = 1 , bar = 10 , fum = 1',
      obj: { foo: '1', bar: '10', fum: '1' },
      note: 'space-dirty comma-separated parameters',
    },
    {
      str: 'foo = 1  ; bar = 10 ; fum = 1',
      obj: { foo: '1', bar: '10', fum: '1' },
      note: 'space-dirty semicolon-separated parameters',
    },
    {
      str: 'foo=1 bar=10,fum=1;baz=0',
      obj: { foo: '1 bar=10,fum=1', baz: '0' },
      note: 'parameters with mixed separators',
    },
    {
      str: 'foo    =2',
      obj: { foo: '2' },
      note: 'left-space-dirty single parameter',
    },
    {
      str: 'foo     =   2',
      obj: { foo: '2' },
      note: 'both-space-dirty single parameter',
    },
    {
      str: 'foo=      2',
      obj: { foo: '2' },
      note: 'right-space-dirty single parameter',
    },
    {
      str: 'foo = 2, 4  ; bar =  4 , , 4 a   ,  ; fum=baz',
      obj: { foo: '2, 4', bar: '4 , , 4 a', fum: 'baz' },
      note: 'dirty parameters with mixed separators',
    },
  ]

  validReadPairs.forEach((pair) => {
    it(`should return valid object from ${pair.note}`, () => {
      chai.expect(readParameters(pair.str)).to.deep.equal(pair.obj)
    })
  })

  it('should read parameters values as strings', () => {
    const obj = readParameters('foo=1;bar=false;fum=0.5;baz=[1,2,3]')
    chai.expect(typeof obj.foo).to.equal('string')
    chai.expect(typeof obj.bar).to.equal('string')
    chai.expect(typeof obj.fum).to.equal('string')
    chai.expect(typeof obj.baz).to.equal('string')
  })

  it('should return null for invalid parameter string', () => {
    chai.expect(readParameters('abc:1')).to.equal(null)
    chai.expect(readParameters('1')).to.equal(null)
    chai.expect(readParameters('')).to.equal(null)
    chai.expect(readParameters(0)).to.equal(null)
    chai.expect(readParameters(false)).to.equal(null)
    chai.expect(readParameters(null)).to.equal(null)
    chai.expect(readParameters(undefined)).to.equal(null)
    chai.expect(readParameters({})).to.equal(null)
    chai.expect(readParameters([])).to.equal(null)
  })
})

describe('writeParameters', () => {
  const validWritePairs = [
    {
      str: 'foo=1;bar=10;fum=1',
      obj: { foo: '1', bar: '10', fum: '1' },
      note: 'valid string from object with multiple parameters',
    },
    {
      str: 'foo=2',
      obj: { foo: '2' },
      note: 'valid string from object with single parameter',
    },
    {
      str: 'bar=0;baz=false',
      obj: { foo: null, bar: 0, fum: undefined, baz: false },
      note: 'valid string omitting empty values from object with multiple parameters',
    },
    {
      str: 'foo={"bar":"a","fum":{"baz":"b"}}',
      obj: { foo: { bar: 'a', fum: { baz: 'b' } } },
      note: 'valid string from nested object',
    },
  ]

  validWritePairs.forEach((pair) => {
    it(`should return ${pair.note}`, () => {
      chai.expect(writeParameters(pair.obj)).to.equal(pair.str)
    })
  })
})

describe('mergeFreshTranslations', () => {
  // Returns the parsed survey after merging.
  const merge = (surveyData, freshContent, protectedLangName) =>
    JSON.parse(mergeFreshTranslations(JSON.stringify(surveyData), freshContent, protectedLangName))

  it("1. updates a $kuid-matched row's non-protected-language translation from fresh content", () => {
    const result = merge(
      {
        survey: [
          { $kuid: 'q1', name: 'q1', type: 'text', 'label::English (en)': 'Hello', 'label::Polski (pl)': 'STALE' },
        ],
      },
      {
        translated: ['label'],
        translations: ['English (en)', 'Polski (pl)'],
        survey: [{ $kuid: 'q1', name: 'q1', label: ['Hello', 'Cześć'] }],
      },
      'English (en)',
    )
    expect(result.survey[0]['label::English (en)']).to.equal('Hello') // protected, untouched
    expect(result.survey[0]['label::Polski (pl)']).to.equal('Cześć') // updated
  })

  it('2. falls back to name matching when the row has no $kuid', () => {
    const result = merge(
      { survey: [{ name: 'q1', type: 'text', 'label::English (en)': 'Hello', 'label::Polski (pl)': 'STALE' }] },
      {
        translated: ['label'],
        translations: ['English (en)', 'Polski (pl)'],
        survey: [{ $kuid: 'q1', name: 'q1', label: ['Hello', 'Cześć'] }],
      },
      'English (en)',
    )
    expect(result.survey[0]['label::Polski (pl)']).to.equal('Cześć')
  })

  it('3. never touches the protected language key even when fresh content differs there', () => {
    const result = merge(
      { survey: [{ name: 'q1', 'label::English (en)': 'IN PROGRESS EDIT', 'label::Polski (pl)': 'old' }] },
      {
        translated: ['label'],
        translations: ['English (en)', 'Polski (pl)'],
        survey: [{ name: 'q1', label: ['Different English', 'Nowy'] }],
      },
      'English (en)',
    )
    expect(result.survey[0]['label::English (en)']).to.equal('IN PROGRESS EDIT') // protected suffixed key preserved
    expect(result.survey[0]['label::Polski (pl)']).to.equal('Nowy')
  })

  it('4. leaves no phantom key for a language removed from fresh translations', () => {
    const result = merge(
      {
        survey: [
          { name: 'q1', 'label::English (en)': 'Hello', 'label::Polski (pl)': 'Cześć', 'label::Deutsch (de)': 'Hallo' },
        ],
      },
      {
        translated: ['label'],
        translations: ['English (en)', 'Polski (pl)'], // Deutsch removed
        survey: [{ name: 'q1', label: ['Hello', 'Cześć'] }],
      },
      'English (en)',
    )
    expect(result.survey[0]).to.not.have.property('label::Deutsch (de)')
    expect(result.survey[0]['label::Polski (pl)']).to.equal('Cześć')
  })

  it('5. creates a new key for a language added to fresh translations', () => {
    const result = merge(
      { survey: [{ name: 'q1', 'label::English (en)': 'Hello', 'label::Polski (pl)': 'Cześć' }] },
      {
        translated: ['label'],
        translations: ['English (en)', 'Polski (pl)', 'Deutsch (de)'], // Deutsch added
        survey: [{ name: 'q1', label: ['Hello', 'Cześć', 'Hallo'] }],
      },
      'English (en)',
    )
    expect(result.survey[0]['label::Deutsch (de)']).to.equal('Hallo')
  })

  it('6. leaves a row present in surveyData but absent from fresh content completely untouched', () => {
    const result = merge(
      {
        survey: [
          { name: 'q1', 'label::English (en)': 'Hello', 'label::Polski (pl)': 'Cześć' },
          { name: 'q2', 'label::English (en)': 'New Q', 'label::Polski (pl)': 'unsaved' }, // newly added, unsaved
        ],
      },
      {
        translated: ['label'],
        translations: ['English (en)', 'Polski (pl)'],
        survey: [{ name: 'q1', label: ['Hello', 'Zmienione'] }],
      },
      'English (en)',
    )
    expect(result.survey[1]['label::English (en)']).to.equal('New Q')
    expect(result.survey[1]['label::Polski (pl)']).to.equal('unsaved') // untouched
  })

  it('7. updates a choice matched by name + list_name (no $kuid)', () => {
    const result = merge(
      { choices: [{ name: 'yes', list_name: 'yn', 'label::English (en)': 'Yes', 'label::Polski (pl)': 'STALE' }] },
      {
        translated: ['label'],
        translations: ['English (en)', 'Polski (pl)'],
        choices: [{ name: 'yes', list_name: 'yn', label: ['Yes', 'Tak'] }],
      },
      'English (en)',
    )
    expect(result.choices[0]['label::Polski (pl)']).to.equal('Tak')
    expect(result.choices[0]['label::English (en)']).to.equal('Yes')
  })

  it('8. resolves langNames[0] from translations_0 when translations[0] is null', () => {
    // protectedLangName is null here so the index-0 write is observable: if the
    // translations_0 fallback works, the value lands under `label::English (en)`
    // (suffixed); if it failed, it would land under the bare `label` key.
    const result = merge(
      { survey: [{ name: 'q1' }] },
      {
        translated: ['label'],
        translations: [null, 'Polski (pl)'],
        translations_0: 'English (en)',
        survey: [{ name: 'q1', label: ['Hello', 'Cześć'] }],
      },
      null,
    )
    expect(result.survey[0]['label::English (en)']).to.equal('Hello')
    expect(result.survey[0]['label::Polski (pl)']).to.equal('Cześć')
    expect(result.survey[0]).to.not.have.property('label')
  })
})

describe('resolveCurrentPrimaryLanguage', () => {
  it('1. prefers the fresh asset primary language over the frozen mount snapshot', () => {
    const result = resolveCurrentPrimaryLanguage(
      { translations: ['French (fr)', 'English (en)'], translated: ['label'] },
      { translations_0: 'English (en)', translated: ['label', 'hint'] },
    )
    expect(result.primaryLangName).to.equal('French (fr)')
    expect(result.translatedProps).to.deep.equal(['label'])
  })

  it('2. falls back to translations_0 when fresh translations[0] is null', () => {
    const result = resolveCurrentPrimaryLanguage(
      { translations: [null, 'Polski (pl)'], translations_0: 'English (en)', translated: ['label'] },
      undefined,
    )
    expect(result.primaryLangName).to.equal('English (en)')
  })

  it('3. falls back to the frozen mount snapshot when there is no fresh content', () => {
    const result = resolveCurrentPrimaryLanguage(undefined, { translations_0: 'English (en)', translated: ['label'] })
    expect(result.primaryLangName).to.equal('English (en)')
    expect(result.translatedProps).to.deep.equal(['label'])
  })

  it('4. returns null and an empty list when neither source has a primary language', () => {
    const result = resolveCurrentPrimaryLanguage(undefined, undefined)
    expect(result.primaryLangName).to.equal(null)
    expect(result.translatedProps).to.deep.equal([])
  })
})

describe('applyFreshPrimaryLanguage', () => {
  it('1. unnullifies the survey JSON when a primary language is found', () => {
    const surveyDataJSON = JSON.stringify({ settings: [{}], survey: [{ name: 'q1', label: 'Hello' }] })
    const result = applyFreshPrimaryLanguage(
      surveyDataJSON,
      { translations: ['English (en)'], translated: ['label'] },
      undefined,
    )
    expect(result.primaryLangName).to.equal('English (en)')
    const survey = JSON.parse(result.surveyDataJSON)
    expect(survey.survey[0]['label::English (en)']).to.equal('Hello')
  })

  it('2. leaves the survey JSON untouched when no primary language is found', () => {
    const surveyDataJSON = JSON.stringify({ settings: [{}], survey: [{ name: 'q1', label: 'Hello' }] })
    const result = applyFreshPrimaryLanguage(surveyDataJSON, undefined, undefined)
    expect(result.primaryLangName).to.equal(null)
    expect(result.surveyDataJSON).to.equal(surveyDataJSON)
  })
})
