# frozen_string_literal: true

module PageObjects
  module Components
    module Chat
      class ThreadIndicator < PageObjects::Components::Base
        attr_reader :context

        SELECTOR = ".chat-message-thread-indicator"

        def initialize(context)
          @context = context
        end

        def click
          find(@context).find(SELECTOR).click
        end

        def exists?(**args)
          find(@context).has_css?(SELECTOR)
        end

        def does_not_exist?(**args)
          find(@context).has_no_css?(SELECTOR)
        end

        def has_reply_count?(count)
          find(@context).has_css?(
            "#{SELECTOR}__replies-count",
            text: I18n.t("js.chat.thread.replies", count: count),
          )
        end

        def has_participant?(user)
          find(@context).has_css?(
            ".chat-thread-participants__avatar-group .chat-user-avatar .chat-user-avatar-container[data-user-card=\"#{user.username}\"] img",
          )
        end

        def has_excerpt?(message)
          excerpt_text =
            message.censored_excerpt(rich: true, max_length: ::Chat::Thread::EXCERPT_LENGTH).gsub(
              "&hellip;",
              "…",
            )
          find(@context).has_css?("#{SELECTOR}__last-reply-excerpt", text: excerpt_text)
        end
      end
    end
  end
end
