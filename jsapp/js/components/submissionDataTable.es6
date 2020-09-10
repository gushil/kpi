import React from 'react';
import autoBind from 'react-autobind';
import {
  t,
  formatTimeDate,
  formatDate
} from 'js/utils';
import {bem} from 'js/bem';
import {renderTypeIcon} from 'js/assetUtils';
import {
  DISPLAY_GROUP_TYPES,
  getSubmissionDisplayData
} from 'js/submissionUtils';
import {
  QUESTION_TYPES,
  SCORE_ROW_TYPE,
  RANK_LEVEL_TYPE
} from 'js/constants';

/**
 * @prop {object} asset
 * @prop {object} submissionData
 * @prop {number} translationIndex
 * @prop {boolean} [showXMLNames]
 */
class SubmissionDataTable extends React.Component {
  constructor(props){
    super(props);
    autoBind(this);
  }

  /**
   * @prop {DisplayGroup} item
   * @prop {number} itemIndex
   */
  renderGroup(item, itemIndex) {
    return (
      <bem.SubmissionDataTable__row
        m={['group', `type-${item.type}`]}
        key={`${item.name}__${itemIndex}`}
      >
        {item.name !== null &&
          <bem.SubmissionDataTable__row m='group-label'>
            {item.label}
            {this.props.showXMLNames &&
              <bem.SubmissionDataTable__XMLName>
                {item.name}
              </bem.SubmissionDataTable__XMLName>
            }
          </bem.SubmissionDataTable__row>
        }

        {item.type === DISPLAY_GROUP_TYPES.get('group_root') &&
          <bem.SubmissionDataTable__row m={['columns', 'column-names']}>
            <bem.SubmissionDataTable__column m='type'>
              {t('Type')}
            </bem.SubmissionDataTable__column>

            <bem.SubmissionDataTable__column m='label'>
              {t('Question')}
            </bem.SubmissionDataTable__column>

            <bem.SubmissionDataTable__column m='data'>
              {t('Response')}
            </bem.SubmissionDataTable__column>
          </bem.SubmissionDataTable__row>
        }

        <bem.SubmissionDataTable__row m='group-children'>
          {item.children.map((child, index) => {
            if (DISPLAY_GROUP_TYPES.has(child.type)) {
              return this.renderGroup(child, index);
            } else {
              return this.renderResponse(child, index);
            }
          })}
        </bem.SubmissionDataTable__row>
      </bem.SubmissionDataTable__row>
    );
  }

  /**
   * @prop {DisplayResponse} item
   * @prop {number} itemIndex
   */
  renderResponse(item, itemIndex) {
    return (
      <bem.SubmissionDataTable__row
        m={['columns', 'response', `type-${item.type}`]}
        key={`${item.name}__${itemIndex}`}
      >
        <bem.SubmissionDataTable__column m='type'>
          {renderTypeIcon(item.type)}
        </bem.SubmissionDataTable__column>

        <bem.SubmissionDataTable__column m='label'>
          {item.label}
          {this.props.showXMLNames &&
            <bem.SubmissionDataTable__XMLName>
              {item.name}
            </bem.SubmissionDataTable__XMLName>
          }
        </bem.SubmissionDataTable__column>

        <bem.SubmissionDataTable__column m='data'>
          {this.renderResponseData(item.type, item.data)}
        </bem.SubmissionDataTable__column>
      </bem.SubmissionDataTable__row>
    );
  }

  /**
   * @prop {string} type
   * @prop {string|null} data
   */
  renderResponseData(type, data) {
    if (data === null) {
      return null;
    }

    let choice;

    switch (type) {
      case QUESTION_TYPES.get('select_one').id:
      case SCORE_ROW_TYPE:
      case RANK_LEVEL_TYPE:
        choice = this.findChoice(data);
        return (
          <bem.SubmissionDataTable__value>
            {choice.label[this.props.translationIndex]}
          </bem.SubmissionDataTable__value>
        );
      case QUESTION_TYPES.get('select_multiple').id:
        return (
          <ul>
            {data.split(' ').map((answer, answerIndex) => {
              choice = this.findChoice(answer);
              return (
                <li key={answerIndex}>
                  <bem.SubmissionDataTable__value>
                    {choice.label[this.props.translationIndex]}
                  </bem.SubmissionDataTable__value>
                </li>
              );
            })}
          </ul>
        );
      case QUESTION_TYPES.get('date').id:
        return (
          <bem.SubmissionDataTable__value>
            {formatDate(data)}
          </bem.SubmissionDataTable__value>
        );
      case QUESTION_TYPES.get('datetime').id:
        return (
          <bem.SubmissionDataTable__value>
            {formatTimeDate(data)}
          </bem.SubmissionDataTable__value>
        );
      case QUESTION_TYPES.get('geopoint').id:
        return this.renderPointData(data);
      case QUESTION_TYPES.get('image').id:
      case QUESTION_TYPES.get('audio').id:
      case QUESTION_TYPES.get('video').id:
      case QUESTION_TYPES.get('file').id:
        return this.renderAttachment(type, data);
      case QUESTION_TYPES.get('geotrace').id:
        return this.renderMultiplePointsData(data);
      case QUESTION_TYPES.get('geoshape').id:
        return this.renderMultiplePointsData(data);
      default:
        // all types not specified above just returns raw data
        return (
          <bem.SubmissionDataTable__value>
            {data}
          </bem.SubmissionDataTable__value>
        );
    }
  }

  /**
   * @prop {string} name
   * @returns {object|undefined}
   */
  findChoice(name) {
    return this.props.asset.content.choices.find((choice) => {
      return choice.name === name;
    });
  }

  /**
   * @prop {string} filename
   * @returns {object|undefined}
   */
  findAttachmentData(targetFilename) {
    // Match filename with full filename in attachment list
    // BUG: this works but is possible to find bad attachment as `includes` can match multiple
    return this.props.submissionData._attachments.find((attachment) => {
      return attachment.filename.endsWith(`/${targetFilename}`);
    });
  }

  /**
   * @prop {string} data
   */
  renderPointData(data) {
    const parts = data.split(' ');
    return (
      <ul>
        <li>
          {t('latitude (x.y °):') + ' '}
          <bem.SubmissionDataTable__value>{parts[0]}</bem.SubmissionDataTable__value>
        </li>
        <li>
          {t('longitude (x.y °):') + ' '}
          <bem.SubmissionDataTable__value>{parts[1]}</bem.SubmissionDataTable__value>
        </li>
        <li>
          {t('altitude (m):') + ' '}
          <bem.SubmissionDataTable__value>{parts[2]}</bem.SubmissionDataTable__value>
        </li>
        <li>
          {t('accuracy (m):') + ' '}
          <bem.SubmissionDataTable__value>{parts[3]}</bem.SubmissionDataTable__value>
        </li>
      </ul>
    );
  }

  /**
   * @prop {string} data
   */
  renderMultiplePointsData(data) {
    return (data.split(';').map((pointData, pointIndex) => {
      return (
        <bem.SubmissionDataTable__row m={['columns', 'point']} key={pointIndex}>
          <bem.SubmissionDataTable__column>
            P<sub>{pointIndex + 1}</sub>
          </bem.SubmissionDataTable__column>
          <bem.SubmissionDataTable__column>
            {this.renderPointData(pointData)}
          </bem.SubmissionDataTable__column>
        </bem.SubmissionDataTable__row>
      );
    }));
  }

  /**
   * @prop {string} type
   * @prop {string} filename
   */
  renderAttachment(type, filename) {
    const attachment = this.findAttachmentData(filename);

    if (type === QUESTION_TYPES.get('image').id) {
      return (
        <a href={attachment.download_url} target='_blank'>
          <img src={attachment.download_small_url}/>
        </a>
      );
    } else {
      return (<a href={attachment.download_url} target='_blank'>{filename}</a>);
    }
  }

  /**
   * @prop {string} dataName
   * @prop {string} label
   */
  renderMetaResponse(dataName, label) {
    return (
      <bem.SubmissionDataTable__row m={['columns', 'response', 'metadata']}>
        <bem.SubmissionDataTable__column m='type'>
          <i className='fa fa-cubes'/>
        </bem.SubmissionDataTable__column>

        <bem.SubmissionDataTable__column m='label'>
          {label}
          {this.props.showXMLNames &&
            <bem.SubmissionDataTable__XMLName>
              {dataName}
            </bem.SubmissionDataTable__XMLName>
          }
        </bem.SubmissionDataTable__column>

        <bem.SubmissionDataTable__column m='data'>
          {this.props.submissionData[dataName]}
        </bem.SubmissionDataTable__column>
      </bem.SubmissionDataTable__row>
    );
  }

  render() {
    const displayData = getSubmissionDisplayData(
      this.props.asset.content.survey,
      this.props.asset.content.choices,
      this.props.translationIndex,
      this.props.submissionData
    );

    return (
      <bem.SubmissionDataTable>
        {this.renderGroup(displayData)}

        {this.renderMetaResponse('start', t('start'))}
        {this.renderMetaResponse('end', t('end'))}
        {this.renderMetaResponse('__version__', t('__version__'))}
        {this.renderMetaResponse('meta/instanceID', t('instanceID'))}
        {this.renderMetaResponse('_submitted_by', t('Submitted by'))}
      </bem.SubmissionDataTable>
    );
  }
}

export default SubmissionDataTable;
