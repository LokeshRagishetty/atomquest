export const emailTemplates = {
  goalSubmitted: (userName: string, goalTitle: string, goalUrl: string) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #0f766e; padding: 24px; color: white; text-align: center;">
        <h2 style="margin: 0;">Goal Submitted for Approval</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 16px; color: #374151;">Hello,</p>
        <p style="font-size: 16px; color: #374151;"><strong>${userName}</strong> has submitted a new goal for your approval:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <h3 style="margin: 0; color: #111827;">${goalTitle}</h3>
        </div>
        <p style="font-size: 16px; color: #374151;">Please review it at your earliest convenience.</p>
        <div style="text-align: center; margin-top: 32px;">
          <a href="${goalUrl}" style="background-color: #0f766e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review Goal</a>
        </div>
      </div>
    </div>
  `,

  goalApproved: (goalTitle: string, goalUrl: string) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #10b981; padding: 24px; color: white; text-align: center;">
        <h2 style="margin: 0;">Goal Approved! 🎉</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 16px; color: #374151;">Great news,</p>
        <p style="font-size: 16px; color: #374151;">Your goal has been approved by your manager:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <h3 style="margin: 0; color: #111827;">${goalTitle}</h3>
        </div>
        <div style="text-align: center; margin-top: 32px;">
          <a href="${goalUrl}" style="background-color: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View Goal</a>
        </div>
      </div>
    </div>
  `,

  goalRejected: (goalTitle: string, goalUrl: string) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #ef4444; padding: 24px; color: white; text-align: center;">
        <h2 style="margin: 0;">Goal Requires Revision</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 16px; color: #374151;">Hello,</p>
        <p style="font-size: 16px; color: #374151;">Your manager has requested revisions for your goal:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <h3 style="margin: 0; color: #111827;">${goalTitle}</h3>
        </div>
        <p style="font-size: 16px; color: #374151;">Please review their feedback and resubmit.</p>
        <div style="text-align: center; margin-top: 32px;">
          <a href="${goalUrl}" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review Feedback</a>
        </div>
      </div>
    </div>
  `,

  checkInReminder: (goalTitle: string, goalUrl: string) => `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
      <div style="background-color: #f59e0b; padding: 24px; color: white; text-align: center;">
        <h2 style="margin: 0;">Check-in Reminder</h2>
      </div>
      <div style="padding: 24px;">
        <p style="font-size: 16px; color: #374151;">Hello,</p>
        <p style="font-size: 16px; color: #374151;">It's time to provide an update for your goal:</p>
        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 6px; margin: 16px 0;">
          <h3 style="margin: 0; color: #111827;">${goalTitle}</h3>
        </div>
        <p style="font-size: 16px; color: #374151;">Regular check-ins help keep your progress on track.</p>
        <div style="text-align: center; margin-top: 32px;">
          <a href="${goalUrl}" style="background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Submit Check-in</a>
        </div>
      </div>
    </div>
  `,
};
