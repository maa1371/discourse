import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import I18n from "I18n";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { tracked } from "@glimmer/tracking";
import { FORMAT } from "select-kit/components/future-date-input-selector";
import TopicTimer from "discourse/models/topic-timer";
import { TrackedObject } from "@ember-compat/tracked-built-ins";

export const CLOSE_STATUS_TYPE = "close";
export const CLOSE_AFTER_LAST_POST_STATUS_TYPE = "close_after_last_post";
export const OPEN_STATUS_TYPE = "open";
export const PUBLISH_TO_CATEGORY_STATUS_TYPE = "publish_to_category";
export const DELETE_STATUS_TYPE = "delete";
export const BUMP_TYPE = "bump";
export const DELETE_REPLIES_TYPE = "delete_replies";

function digits_fa2en(value) {
  let newValue = "";
  for (let i = 0; i < value.length; i++) {
    let ch = value.charCodeAt(i);
    if (ch >= 1776 && ch <= 1785) {
      // For Persian digits.
      let newChar = ch - 1728;
      newValue = newValue + String.fromCharCode(newChar);
    } else if (ch >= 1632 && ch <= 1641) {
      // For Arabic & Unix digits.
      let newChar_ = ch - 1584;
      newValue = newValue + String.fromCharCode(newChar_);
    } else {
      newValue = newValue + String.fromCharCode(ch);
    }
  }
  return newValue;
}

export default class EditTopicTimer extends Component {
  @service currentUser;

  @tracked
  topicTimer = new TrackedObject(
    this.args.model.topic?.topic_timer || this.createDefaultTimer()
  );
  @tracked loading = false;
  @tracked flash;

  get defaultStatusType() {
    return this.publicTimerTypes[0].id;
  }

  get publicTimerTypes() {
    const types = [];
    const { closed, category, isPrivateMessage, invisible } =
      this.args.model.topic;

    if (!closed) {
      types.push({
        id: CLOSE_STATUS_TYPE,
        name: I18n.t("topic.auto_close.title"),
      });
      types.push({
        id: CLOSE_AFTER_LAST_POST_STATUS_TYPE,
        name: I18n.t("topic.auto_close_after_last_post.title"),
      });
    }

    if (closed) {
      types.push({
        id: OPEN_STATUS_TYPE,
        name: I18n.t("topic.auto_reopen.title"),
      });
    }

    if (this.args.model.topic.details.can_delete) {
      types.push({
        id: DELETE_STATUS_TYPE,
        name: I18n.t("topic.auto_delete.title"),
      });
    }

    types.push({
      id: BUMP_TYPE,
      name: I18n.t("topic.auto_bump.title"),
    });

    if (this.args.model.topic.details.can_delete) {
      types.push({
        id: DELETE_REPLIES_TYPE,
        name: I18n.t("topic.auto_delete_replies.title"),
      });
    }

    if (closed) {
      types.push({
        id: CLOSE_STATUS_TYPE,
        name: I18n.t("topic.temp_open.title"),
      });
    }

    if (!closed) {
      types.push({
        id: OPEN_STATUS_TYPE,
        name: I18n.t("topic.temp_close.title"),
      });
    }

    if (
      (category && category.read_restricted) ||
      isPrivateMessage ||
      invisible
    ) {
      types.push({
        id: PUBLISH_TO_CATEGORY_STATUS_TYPE,
        name: I18n.t("topic.publish_to_category.title"),
      });
    }

    return types;
  }

  _setTimer(time, durationMinutes, statusType, basedOnLastPost, categoryId) {
    this.loading = true;
    if (time != null) {
      time = digits_fa2en(
        moment(digits_fa2en(time), "jYYYY-jMM-jDD HH:mm").format(
          "YYYY-MM-DD HH:mm:ss"
        )
      );
    }
    TopicTimer.update(
      this.args.model.topic.id,
      time,
      basedOnLastPost,
      statusType,
      categoryId,
      durationMinutes
    )
      .then((result) => {
        if (time || durationMinutes) {
          this.args.model.updateTopicTimerProperty(
            "execute_at",
            result.execute_at
          );
          this.args.model.updateTopicTimerProperty(
            "duration_minutes",
            result.duration_minutes
          );
          this.args.model.updateTopicTimerProperty(
            "category_id",
            result.category_id
          );
          this.args.model.updateTopicTimerProperty("closed", result.closed);
          this.args.closeModal();
        } else {
          const topicTimer = this.createDefaultTimer();
          this.topicTime = topicTimer;
          this.args.model.setTopicTimer(topicTimer);
          this.onChangeInput(null, null);
        }
      })
      .catch(popupAjaxError)
      .finally(() => (this.loading = false));
  }

  @action
  createDefaultTimer() {
    const defaultTimer = TopicTimer.create({
      status_type: this.defaultStatusType,
    });
    this.args.model.setTopicTimer(defaultTimer);
    return defaultTimer;
  }

  @action
  onChangeStatusType(value) {
    const basedOnLastPost = CLOSE_AFTER_LAST_POST_STATUS_TYPE === value;
    this.topicTimer.based_on_last_post = basedOnLastPost;
    this.args.model.updateTopicTimerProperty(
      "based_on_last_post",
      basedOnLastPost
    );
    this.topicTimer.status_type = value;
    this.args.model.updateTopicTimerProperty("status_type", value);
  }

  @action
  onChangeInput(_type, time) {
    if (moment.isMoment(time)) {
      time = time.format(FORMAT);
    }
    this.topicTimer.updateTime = time;
    this.args.model.updateTopicTimerProperty("updateTime", time);
  }

  @action
  async saveTimer() {
    this.flash = null;
    if (!this.topicTimer.updateTime && !this.topicTimer.duration_minutes) {
      this.flash = I18n.t("topic.topic_status_update.time_frame_required");
      return;
    }

    if (this.topicTimer.duration_minutes && !this.topicTimer.updateTime) {
      if (this.topicTimer.duration_minutes <= 0) {
        this.flash = I18n.t("topic.topic_status_update.min_duration");
        return;
      }

      // cannot be more than 20 years
      if (this.topicTimer.duration_minutes > 20 * 365 * 1440) {
        this.flash = I18n.t("topic.topic_status_update.max_duration");
        return;
      }
    }

    let statusType = this.topicTimer.status_type;
    if (statusType === CLOSE_AFTER_LAST_POST_STATUS_TYPE) {
      statusType = CLOSE_STATUS_TYPE;
    }

    await this._setTimer(
      this.topicTimer.updateTime,
      this.topicTimer.duration_minutes,
      statusType,
      this.topicTimer.based_on_last_post,
      this.topicTimer.category_id
    );
  }

  @action
  async removeTimer() {
    let statusType = this.topicTimer.status_type;
    if (statusType === CLOSE_AFTER_LAST_POST_STATUS_TYPE) {
      statusType = CLOSE_STATUS_TYPE;
    }
    await this._setTimer(null, null, statusType);
    // timer has been removed and we are removing `execute_at`
    // which will hide the remove timer button from the modal
    this.topicTimer.execute_at = null;
  }
}
