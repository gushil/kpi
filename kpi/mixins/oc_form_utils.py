# Media columns OC hides behind an `oc_` prefix across standardization, so formpack
# never expands them. OC-13108 needs the export to be `image` or `image::<language>`,
# not `media::image`, which mixes a named and an unnamed language and then blocks
# Form Designer from reopening the form.
OC_UNTRANSLATED_MEDIA_COLUMNS = ('audio', 'image', 'video')


class OCFormUtilsMixin:

    def _adjust_content_custom_column(self, content):
        survey = content.get('survey', [])
        for survey_col_idx in range(len(survey)):
            survey_col = survey[survey_col_idx]
            if 'readonly' in survey_col:
                readonly_val = survey_col['readonly'].lower()
                if readonly_val == 'yes' or readonly_val == 'true':
                    readonly_val = 'true'
                else:
                    readonly_val = 'false'
                content['survey'][survey_col_idx]['oc_readonly'] = readonly_val
                del content['survey'][survey_col_idx]['readonly']
            else:
                content['survey'][survey_col_idx]['oc_readonly'] = 'false'

    def _adjust_content_media_column(self, content):
        """
        Restore the media columns hidden by
        `_adjust_content_media_column_before_standardize`.

        A hidden column can carry a language suffix, because
        `Asset.adjust_content_on_save` may have named it before it was hidden.
        The suffix is dropped on the way back: OC keeps these columns out of
        `content['translated']`, so a suffixed name only leaks the internal
        `oc_` prefix into stored content, the downloaded template and the
        XForm (OC-28513). Matching the suffixed form also repairs content
        already stored with the leaked name.
        """
        for row in content.get('survey', []) + content.get('choices', []):
            for column in list(row.keys()):
                base_column = column.split('::')[0]
                if not base_column.startswith('oc_'):
                    continue
                media_column = base_column[len('oc_'):]
                if media_column in OC_UNTRANSLATED_MEDIA_COLUMNS:
                    row[media_column] = row.pop(column)

        translated = content.get('translated', [])
        for index, column in enumerate(translated):
            base_column = column.split('::')[0]
            if not base_column.startswith('oc_'):
                continue
            media_column = base_column[len('oc_'):]
            if media_column in OC_UNTRANSLATED_MEDIA_COLUMNS:
                translated[index] = media_column
    
    def _adjust_content_media_column_before_standardize(self, content):

        def _adjust_media_columns(survey, non_dc_cols):
            for survey_col_idx in range(len(survey)):
                survey_col = survey[survey_col_idx]
                survey_col_keys = list(survey_col.keys())
                for survey_col_key in survey_col_keys:
                    if survey_col_key in non_dc_cols:
                        survey_col["oc_{}".format(survey_col_key)] = survey_col[survey_col_key]
                        del survey_col[survey_col_key]

        # `choices` needs the same hiding as `survey`, or a media column there
        # (e.g. an image list for a select) reaches formpack unhidden and
        # revives the untranslated/translated language mismatch (OC-28513).
        for sheet_name in ('survey', 'choices'):
            sheet = content.get(sheet_name, [])

            sheet_col_key_list = []
            for sheet_col_idx in range(len(sheet)):
                sheet_col = sheet[sheet_col_idx]
                sheet_col_key_list = sheet_col_key_list + list(sheet_col.keys())

            for non_dc_col in ('audio', 'image', 'video'):
                # Exact name or `name::language`, not any prefix match, so an
                # arbitrary column like `image_url` is left alone.
                non_dc_cols = [
                    s for s in sheet_col_key_list
                    if s == non_dc_col or s.startswith(f'{non_dc_col}::')
                ]

                if len(non_dc_cols) > 0:
                    _adjust_media_columns(sheet, non_dc_cols)

        if 'translations' in content:
            translated = content.get('translated', [])
            non_dc_media_columns = ['audio', 'image', 'video']
            for translated_idx in range(len(translated)):
                for non_dc_media_column in non_dc_media_columns:
                    if non_dc_media_column == translated[translated_idx]:
                        translated[translated_idx] = "oc_{}".format(non_dc_media_column)

    def _revert_custom_column(self, content):
        survey = content.get('survey', [])
        for survey_col_idx in range(len(survey)):
            survey_col = survey[survey_col_idx]
            if 'oc_readonly' in survey_col:
                content['survey'][survey_col_idx]['readonly'] = survey_col['oc_readonly']
                del content['survey'][survey_col_idx]['oc_readonly']