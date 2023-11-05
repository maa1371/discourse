/* global Pikaday:true */
import discourseComputed, { on } from "discourse-common/utils/decorators";
import Component from "@ember/component";
import I18n from "I18n";
import { Promise } from "rsvp";
import { action } from "@ember/object";
import loadScript from "discourse/lib/load-script";
import { schedule } from "@ember/runloop";

function isInputDateSupported() {
  const input = document.createElement("input");
  const value = "a";
  input.setAttribute("type", "date");
  input.setAttribute("value", value);
  return input.value !== value;
}

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

export default Component.extend({
  classNames: ["d-date-input"],
  date: null,
  _picker: null,

  @discourseComputed("site.mobileView")
  inputType() {
    return this.useNativePicker ? "date" : "text";
  },

  useNativePicker: isInputDateSupported(),

  click(event) {
    event.stopPropagation();
  },

  didInsertElement() {
    this._super(...arguments);

    schedule("afterRender", () => {
      if (!this.element || this.isDestroying || this.isDestroying) {
        return;
      }

      let promise;
      const container = document.getElementById(this.containerId);

      if (this.useNativePicker) {
        promise = this._loadNativePicker(container);
      } else {
        promise = this._loadPikadayPicker(container);
      }

      promise.then((picker) => {
        this._picker = picker;

        if (this._picker && this.date) {
          const parsedDate =
            this.date instanceof moment ? this.date : moment(this.date);
          this._picker.setDate(parsedDate, true);
        }
      });
    });
  },

  didUpdateAttrs() {
    this._super(...arguments);

    if (this._picker && this.date) {
      const parsedDate =
        this.date instanceof moment ? this.date : moment(this.date);
      this._picker.setDate(parsedDate, true);
    }

    if (this._picker && this.relativeDate) {
      const parsedRelativeDate =
        this.relativeDate instanceof moment
          ? this.relativeDate
          : moment(this.relativeDate);

      this._picker.setMinDate(parsedRelativeDate, true);
    }

    if (this._picker && !this.date) {
      this._picker.setDate(null);
    }
  },

  _loadPikadayPicker(container) {
    return loadScript("/javascripts/pikaday.js").then(() => {
      let defaultOptions = {
        field: this.element.querySelector(".date-picker"),
        container: container || this.element.querySelector(".picker-container"),
        bound: container === null,
        format: "jYYYY-jMM-jDD",
        firstDay: 0,
        isRTL: true,
        i18n: {
          previousMonth: "ماه قبل",
          nextMonth: "ماه بعد",
          months: [
            "فروردین",
            "اردیبهشت",
            "خرداد",
            "تیر",
            "مرداد",
            "شهریرور",
            "مهر",
            "آبان",
            "آذر",
            "دی",
            "بهمن",
            "اسفند",
          ],
          weekdays: [
            "یک‌شنبه",
            "دو‌شنبه",
            "سه‌‌شنبه",
            "چهار‌شنبه",
            "پنچ‌شنبه",
            "‌جمعه",
            "شنبه",
          ],
          weekdaysShort: ["ی", "د", "س", "چ", "پ", "ج", "ش"],
        },
        onSelect: (date) => this._handleSelection(date),
      };

      if (this.relativeDate) {
        defaultOptions.minDate = moment(this.relativeDate).toDate();
      }

      return new Pikaday({ ...defaultOptions, ...this._opts() });
    });
  },

  _loadNativePicker(container) {
    const wrapper = container || this.element;
    const picker = wrapper.querySelector("input.date-picker");
    picker.onchange = () => this._handleSelection(picker.value);
    picker.hide = () => {
      /* do nothing for native */
    };
    picker.destroy = () => {
      /* do nothing for native */
    };
    picker.setDate = (date) => {
      picker.value = date ? moment(date).format("YYYY-MM-DD") : null;
    };
    picker.setMinDate = (date) => {
      picker.min = date;
    };

    if (this.date) {
      picker.setDate(this.date);
    }

    return Promise.resolve(picker);
  },

  _handleSelection(value) {
    if (!this.element || this.isDestroying || this.isDestroyed) {
      return;
    }

    if (this.onChange) {
      if (value) {
        let dateObj = new Date(value);
        let momentObj = moment(dateObj);
        let momentString = momentObj.format("YYYY-MM-DD"); // 2016-07-15
        const formattedDate = digits_fa2en(momentString);
        this.onChange(value ? formattedDate : null);
      }
      // else{
      //   this.onChange(value ? formattedDate : null);
      // }
    }
  },

  @on("willDestroyElement")
  _destroy() {
    if (this._picker) {
      this._picker.destroy();
      this._picker = null;
    }
  },

  @discourseComputed("_placeholder")
  placeholder: {
    get(_placeholder) {
      return _placeholder || I18n.t("dates.placeholder");
    },

    set(value) {
      this.set("_placeholder", value);
      return value;
    },
  },

  _opts() {
    return null;
  },

  @action
  onChangeDate(event) {
    this._handleSelection(event.target.value);
  },
});
